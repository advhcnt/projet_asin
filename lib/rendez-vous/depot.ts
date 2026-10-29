import "server-only";

import {
  Prisma,
  type RendezVous as RendezVousPrisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  CAPACITE_PAR_CRENEAU,
  controlerAnnulation,
  controlerChangementStatut,
  controlerDisponibilites,
  echec,
  succes,
  trierEtPaginer,
  validerEntree,
  type ContextePriseRendezVous,
  type EntreePriseRendezVous,
  type PageRendezVous,
  type Resultat,
  type RendezVousExistant,
  type Service,
  type Statut,
  type StatutAgent,
} from ".";
import {
  cleDate,
  debutDeJournee,
  estWeekEnd,
  finDeJournee,
  maintenantBenin,
} from "./dates";
import { MESSAGES } from "./messages";

/** Convertit une ligne Prisma vers le type du domaine. */
export function versDomaine(ligne: RendezVousPrisma): RendezVousExistant {
  return {
    id: ligne.id,
    npi: ligne.npi,
    service: ligne.service as Service,
    dateHeure: ligne.dateHeure,
    statut: ligne.statut as Statut,
  };
}

function estConflitDeSerialisation(erreur: unknown): boolean {
  return (
    typeof erreur === "object" &&
    erreur !== null &&
    (erreur as { code?: string }).code === "P2034"
  );
}

const TENTATIVES_CAPACITE = 3;

/**
 * Crée un rendez-vous. La validation de saisie est faite avant d'ouvrir la
 * transaction ; la capacité et l'unicité du rendez-vous à venir sont
 * revérifiées sous isolation Serializable, avec nouvelle tentative en cas de
 * conflit concurrent (TMA-102).
 */
export async function creerRendezVous(
  entree: EntreePriseRendezVous,
): Promise<Resultat<RendezVousExistant>> {
  const maintenant = maintenantBenin();

  const validation = validerEntree(entree, maintenant);
  if (!validation.ok) return validation;
  const valide = validation.valeur;

  for (let tentative = 1; tentative <= TENTATIVES_CAPACITE; tentative++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const existants = await tx.rendezVous.findMany({
            where: {
              OR: [{ npi: valide.npi }, { dateHeure: valide.dateHeure }],
            },
          });

          const contexte: ContextePriseRendezVous = {
            maintenant,
            rendezVous: existants.map(versDomaine),
          };
          const controle = controlerDisponibilites(
            valide,
            contexte.rendezVous,
            maintenant,
          );
          if (!controle.ok) return controle;

          const cree = await tx.rendezVous.create({
            data: {
              npi: valide.npi,
              service: valide.service,
              dateHeure: valide.dateHeure,
              statut: "confirme",
              creeLe: maintenant,
            },
          });

          return succes(versDomaine(cree));
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (erreur) {
      if (
        estConflitDeSerialisation(erreur) &&
        tentative < TENTATIVES_CAPACITE
      ) {
        continue;
      }
      if (estConflitDeSerialisation(erreur)) {
        return echec(409, MESSAGES.creneauComplet);
      }
      throw erreur;
    }
  }

  return echec(409, MESSAGES.creneauComplet);
}

/** Annule un rendez-vous confirmé et trace le changement dans l'historique. */
export async function annulerRendezVous(
  id: number,
): Promise<Resultat<RendezVousExistant>> {
  const maintenant = maintenantBenin();

  return prisma.$transaction(async (tx) => {
    const ligne = await tx.rendezVous.findUnique({ where: { id } });
    if (!ligne) return echec(404, MESSAGES.rendezVousIntrouvable);

    const domaine = versDomaine(ligne);
    const controle = controlerAnnulation(domaine, maintenant);
    if (!controle.ok) return controle;

    const modifie = await tx.rendezVous.update({
      where: { id },
      data: { statut: "annule" },
    });

    await tx.historiqueStatut.create({
      data: {
        rendezVousId: id,
        ancienStatut: "confirme",
        nouveauStatut: "annule",
        modifieLe: maintenant,
        modifiePar: "usager",
      },
    });

    return succes(versDomaine(modifie));
  });
}

/** Passe un rendez-vous confirmé à honoré ou absent. */
export async function changerStatutRendezVous(
  id: number,
  statutDemande: unknown,
  agent: string,
): Promise<Resultat<RendezVousExistant>> {
  const maintenant = maintenantBenin();

  return prisma.$transaction(async (tx) => {
    const ligne = await tx.rendezVous.findUnique({ where: { id } });
    if (!ligne) return echec(404, MESSAGES.rendezVousIntrouvable);

    const domaine = versDomaine(ligne);
    const controle = controlerChangementStatut(domaine, statutDemande);
    if (!controle.ok) return controle;

    const statut: StatutAgent = controle.valeur.statut;
    const modifie = await tx.rendezVous.update({
      where: { id },
      data: { statut },
    });

    await tx.historiqueStatut.create({
      data: {
        rendezVousId: id,
        ancienStatut: "confirme",
        nouveauStatut: statut,
        modifieLe: maintenant,
        modifiePar: agent,
      },
    });

    return succes(versDomaine(modifie));
  });
}

export interface PageUsager extends Omit<PageRendezVous, "elements"> {
  elements: RendezVousExistant[];
}

/**
 * Liste paginée des rendez-vous d'un usager. Le tri et le découpage sont
 * confiés au module de règles, pas à SQL (TMA-106).
 */
export async function listerRendezVousUsager(
  npi: string,
  pageDemandee: number,
  maintenant: Date = maintenantBenin(),
): Promise<PageUsager> {
  const lignes = await prisma.rendezVous.findMany({ where: { npi } });
  return trierEtPaginer(lignes.map(versDomaine), {
    page: pageDemandee,
    maintenant,
  });
}

/** Rendez-vous d'une journée (heure du Bénin), pour le guichet. */
export async function listerRendezVousDuJour(
  debut: Date,
  statut?: Statut,
): Promise<RendezVousExistant[]> {
  const lignes = await prisma.rendezVous.findMany({
    where: {
      dateHeure: { gte: debutDeJournee(debut), lt: finDeJournee(debut) },
      ...(statut ? { statut } : {}),
    },
    orderBy: [{ dateHeure: "asc" }, { id: "asc" }],
  });

  return lignes.map(versDomaine);
}

export interface CreneauDisponibilite {
  heure: string;
  dateHeure: string;
  occupants: number;
  disponible: boolean;
}

export interface DisponibilitesJour {
  date: string;
  ferme: boolean;
  creneaux: CreneauDisponibilite[];
}

/**
 * Occupation des créneaux d'une journée : au plus 3 rendez-vous non annulés
 * par créneau. Le week-end, tous les créneaux sont indisponibles.
 */
export async function disponibilitesDuJour(
  jour: Date,
): Promise<DisponibilitesJour> {
  const debut = debutDeJournee(jour);
  const ferme = estWeekEnd(debut);

  const comptes = ferme
    ? []
    : await prisma.rendezVous.groupBy({
        by: ["dateHeure"],
        where: {
          dateHeure: { gte: debut, lt: finDeJournee(jour) },
          statut: { not: "annule" },
        },
        _count: { _all: true },
        orderBy: { dateHeure: "asc" },
      });

  const occupantsParCreneau = new Map(
    comptes.map((compte) => [
      compte.dateHeure.getTime(),
      compte._count._all,
    ]),
  );

  const creneaux: CreneauDisponibilite[] = [];
  // 08:00 (480 min) à 15:30 (930 min), pas de 30 minutes.
  for (let minutes = 8 * 60; minutes <= 15 * 60 + 30; minutes += 30) {
    const dateHeure = new Date(debut.getTime() + minutes * 60 * 1000);
    const occupants = occupantsParCreneau.get(dateHeure.getTime()) ?? 0;
    const heure = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
      minutes % 60,
    ).padStart(2, "0")}`;

    creneaux.push({
      heure,
      dateHeure: dateHeure.toISOString(),
      occupants,
      disponible: !ferme && occupants < CAPACITE_PAR_CRENEAU,
    });
  }

  return { date: cleDate(debut), ferme, creneaux };
}
