import {
  serialiserRendezVous,
} from "@/lib/rendez-vous/presentation";
import {
  creerRendezVous,
  listerRendezVousDuJour,
} from "@/lib/rendez-vous/depot";
import {
  cleDate,
  estStatut,
  maintenantBenin,
  parserDateBenin,
} from "@/lib/rendez-vous";
import { MESSAGES } from "@/lib/rendez-vous/messages";
import { erreurInterne, lireCorpsJson } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Prise de rendez-vous usager. */
export async function POST(request: Request) {
  const corps = await lireCorpsJson(request);

  try {
    const resultat = await creerRendezVous({
      npi: corps?.npi,
      service: corps?.service,
      dateHeure: corps?.dateHeure,
    });

    if (!resultat.ok) {
      return Response.json(
        { erreur: resultat.message },
        { status: resultat.status },
      );
    }

    return Response.json(serialiserRendezVous(resultat.valeur), {
      status: 201,
    });
  } catch (erreur) {
    return erreurInterne(erreur);
  }
}

/** Liste des rendez-vous d'une journée, pour l'écran agent. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateDemandee = url.searchParams.get("date");
  const jour = dateDemandee
    ? parserDateBenin(dateDemandee)
    : maintenantBenin();

  if (!jour) {
    return Response.json(
      { erreur: MESSAGES.dateInvalide },
      { status: 400 },
    );
  }

  const statutDemande = url.searchParams.get("statut");
  const statut = estStatut(statutDemande) ? statutDemande : undefined;

  try {
    const rendezVous = await listerRendezVousDuJour(jour, statut);
    const maintenant = maintenantBenin();

    return Response.json({
      date: cleDate(jour),
      rendezVous: rendezVous.map((rdv) =>
        serialiserRendezVous(rdv, maintenant),
      ),
    });
  } catch (erreur) {
    return erreurInterne(erreur);
  }
}
