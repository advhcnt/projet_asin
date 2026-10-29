import { erreurInterne } from "@/lib/api";
import { maintenantBenin, parserDateBenin } from "@/lib/rendez-vous";
import { disponibilitesDuJour } from "@/lib/rendez-vous/depot";
import { MESSAGES } from "@/lib/rendez-vous/messages";

export const dynamic = "force-dynamic";

/** Créneaux de 08:00 à 15:30 et nombre d'occupants (hors annulés). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateDemandee = url.searchParams.get("date");
  const jour = dateDemandee ? parserDateBenin(dateDemandee) : maintenantBenin();

  if (!jour) {
    return Response.json(
      { erreur: MESSAGES.dateInvalide },
      { status: 400 },
    );
  }

  try {
    return Response.json(await disponibilitesDuJour(jour));
  } catch (erreur) {
    return erreurInterne(erreur);
  }
}
