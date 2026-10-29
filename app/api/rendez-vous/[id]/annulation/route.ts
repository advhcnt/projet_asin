import { lireId, erreurInterne } from "@/lib/api";
import { MESSAGES } from "@/lib/rendez-vous/messages";
import { annulerRendezVous } from "@/lib/rendez-vous/depot";
import { serialiserRendezVous } from "@/lib/rendez-vous/presentation";

export const dynamic = "force-dynamic";

/** Annulation par l'usager, jusqu'à 24 h avant le rendez-vous. */
export async function POST(
  _request: Request,
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

  try {
    const resultat = await annulerRendezVous(id);

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
