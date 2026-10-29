/**
 * Module de règles métier — indépendant de toute base de données et de tout
 * framework. L'heure courante est toujours reçue en paramètre.
 *
 * Toutes les dates sont des heures du Bénin encodées en UTC (voir types.ts).
 */
import {
  estDansLaGrille,
  estWeekEnd,
  parserDateHeureBenin,
} from "./dates";
import { MESSAGES } from "./messages";
import {
  estService,
  type ContextePriseRendezVous,
  type EntreePriseRendezVous,
  type RendezVousExistant,
  type RendezVousValide,
  type StatutAgent,
} from "./types";

export const CAPACITE_PAR_CRENEAU = 3;
export const DELAI_ANNULATION_MS = 24 * 60 * 60 * 1000;
export const PAGE_PAR_DEFAUT = 10;

const NPI_VALIDE = /^\d{10}$/;

export interface Echec {
  ok: false;
  status: 400 | 404 | 409;
  message: string;
}

export interface Succes<T> {
  ok: true;
  valeur: T;
}

export type Resultat<T> = Succes<T> | Echec;

export function succes<T>(valeur: T): Succes<T> {
  return { ok: true, valeur };
}

export function echec(status: 400 | 404 | 409, message: string): Echec {
  return { ok: false, status, message };
}

function estAVenir(rendezVous: RendezVousExistant, maintenant: Date): boolean {
  return (
    rendezVous.statut === "confirme" &&
    rendezVous.dateHeure.getTime() >= maintenant.getTime()
  );
}

/**
 * Valide la saisie seule (NPI, service, lisibilité, date passée, week-end,
 * grille horaire). Ne consulte aucun rendez-vous existant.
 */
export function validerEntree(
  entree: EntreePriseRendezVous,
  maintenant: Date,
): Resultat<RendezVousValide> {
  if (typeof entree.npi !== "string" || !NPI_VALIDE.test(entree.npi)) {
    return echec(400, MESSAGES.npiInvalide);
  }

  if (!estService(entree.service)) {
    return echec(400, MESSAGES.serviceInconnu);
  }

  const dateHeure = parserDateHeureBenin(entree.dateHeure);
  if (!dateHeure) {
    return echec(400, MESSAGES.dateInvalide);
  }

  if (dateHeure.getTime() < maintenant.getTime()) {
    return echec(409, MESSAGES.datePassee);
  }

  if (estWeekEnd(dateHeure)) {
    return echec(409, MESSAGES.weekEnd);
  }

  if (!estDansLaGrille(dateHeure)) {
    return echec(409, MESSAGES.creneauInvalide);
  }

  return succes({ npi: entree.npi, service: entree.service, dateHeure });
}

/**
 * Contrôle les règles qui dépendent des rendez-vous existants : un seul
 * rendez-vous à venir par usager, puis trois places par créneau (les
 * rendez-vous annulés ne comptent pas).
 */
export function controlerDisponibilites(
  entree: RendezVousValide,
  rendezVous: readonly RendezVousExistant[],
  maintenant: Date,
): Resultat<RendezVousValide> {
  const dejaUnRendezVous = rendezVous.some(
    (existant) =>
      existant.npi === entree.npi && estAVenir(existant, maintenant),
  );
  if (dejaUnRendezVous) {
    return echec(409, MESSAGES.dejaAVenir);
  }

  // Un rendez-vous annulé libère sa place.
  const occupants = rendezVous.filter(
    (existant) =>
      existant.statut !== "annule" &&
      existant.dateHeure.getTime() === entree.dateHeure.getTime(),
  ).length;
  if (occupants >= CAPACITE_PAR_CRENEAU) {
    return echec(409, MESSAGES.creneauComplet);
  }

  return succes(entree);
}

/**
 * Contrôle complet d'une prise de rendez-vous.
 *
 * Ordre de contrôle : NPI, service, lisibilité de la date, date passée,
 * week-end, grille horaire, rendez-vous déjà à venir, capacité du créneau.
 */
export function controlerPriseRendezVous(
  entree: EntreePriseRendezVous,
  contexte: ContextePriseRendezVous,
): Resultat<RendezVousValide> {
  const validation = validerEntree(entree, contexte.maintenant);
  if (!validation.ok) return validation;

  return controlerDisponibilites(
    validation.valeur,
    contexte.rendezVous,
    contexte.maintenant,
  );
}

/** Annulation possible jusqu'à 24 h avant l'heure prévue, incluse. */
export function controlerAnnulation(
  rendezVous: RendezVousExistant,
  maintenant: Date,
): Resultat<RendezVousExistant> {
  if (rendezVous.statut !== "confirme") {
    return echec(409, MESSAGES.annulationNonConfirmee);
  }

  const delai = rendezVous.dateHeure.getTime() - maintenant.getTime();
  if (delai < DELAI_ANNULATION_MS) {
    return echec(409, MESSAGES.annulationTardive);
  }

  return succes(rendezVous);
}

export function estAnnulable(
  rendezVous: RendezVousExistant,
  maintenant: Date,
): boolean {
  return controlerAnnulation(rendezVous, maintenant).ok;
}

/**
 * Passage d'un rendez-vous confirmé à honoré/absent. Seuls les statuts
 * définitifs `honore` et `absent` sont acceptés pour un agent ; un rendez-vous
 * déjà clôturé (annulé, honoré, absent) est refusé.
 */
export function controlerChangementStatut(
  rendezVous: RendezVousExistant,
  statutDemande: unknown,
): Resultat<{ rendezVous: RendezVousExistant; statut: StatutAgent }> {
  if (statutDemande !== "honore" && statutDemande !== "absent") {
    return echec(400, MESSAGES.statutInconnu);
  }

  if (rendezVous.statut !== "confirme") {
    return echec(409, MESSAGES.dejaCloture);
  }

  return succes({ rendezVous, statut: statutDemande });
}

export interface OptionsListe {
  page?: number;
  parPage?: number;
  /** Heure courante du Bénin, encodée en UTC. */
  maintenant: Date;
}

export interface PageRendezVous {
  page: number;
  parPage: number;
  total: number;
  totalPages: number;
  elements: RendezVousExistant[];
}

/**
 * Tri « prochain rendez-vous en tête, puis du plus récent au plus ancien »,
 * puis découpage en pages (10 par défaut).
 */
export function trierEtPaginer(
  rendezVous: readonly RendezVousExistant[],
  options: OptionsListe,
): PageRendezVous {
  const parPageDemande = options.parPage ?? PAGE_PAR_DEFAUT;
  const parPage =
    Number.isInteger(parPageDemande) && parPageDemande > 0
      ? Math.min(parPageDemande, 100)
      : PAGE_PAR_DEFAUT;

  const pageDemandee = options.page ?? 1;
  const page =
    Number.isInteger(pageDemandee) && pageDemandee > 0 ? pageDemandee : 1;

  const tries = [...rendezVous].sort((a, b) => {
    const aVenirA = estAVenir(a, options.maintenant);
    const aVenirB = estAVenir(b, options.maintenant);

    // Le prochain rendez-vous confirmé passe avant l'historique.
    if (aVenirA !== aVenirB) return aVenirA ? -1 : 1;

    const ecart = a.dateHeure.getTime() - b.dateHeure.getTime();
    if (ecart !== 0) return aVenirA ? ecart : -ecart;

    return b.id - a.id;
  });

  const total = tries.length;
  const totalPages = Math.max(1, Math.ceil(total / parPage));
  const debut = (page - 1) * parPage;

  return {
    page,
    parPage,
    total,
    totalPages,
    elements: tries.slice(debut, debut + parPage),
  };
}
