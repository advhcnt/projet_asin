import { erreurInterne, lireAgent, lireCorpsJson, lireId } from "@/lib/api";
import { MESSAGES } from "@/lib/rendez-vous/messages";
import { changerStatutRendezVous } from "@/lib/rendez-vous/depot";
import { serialiserRendezVous } from "@/lib/rendez-vous/presentation";

export const dynamic = "force-dynamic";

/** Clôture d'un rendez-vous par un agent : honore ou absent. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idBrut } = await params;
  const id = lireId(idBrut);

  if (id === null) {
    return Response.json(
      { erreur: MESSAGES.rendezVousIntrouvable },
      { status: 404 },
    );
  }

  const corps = await lireCorpsJson(request);
  const agent = lireAgent(request, corps);

  try {
    const resultat = await changerStatutRendezVous(
      id,
      corps?.statut,
      agent,
    );

    if (!resultat.ok) {
      return Response.json(
        { erreur: resultat.message },
        { status: resultat.status },
      );
    }

    return Response.json(serialiserRendezVous(resultat.valeur));
  } catch (erreur) {
    return erreurInterne(erreur);
  }
}
