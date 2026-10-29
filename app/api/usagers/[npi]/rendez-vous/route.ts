import { erreurInterne } from "@/lib/api";
import { MESSAGES } from "@/lib/rendez-vous/messages";
import { listerRendezVousUsager } from "@/lib/rendez-vous/depot";
import { maintenantBenin } from "@/lib/rendez-vous";
import { serialiserPage } from "@/lib/rendez-vous/presentation";

export const dynamic = "force-dynamic";

/** Rendez-vous d'un usager : prochain en tête, puis du plus récent au plus ancien. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ npi: string }> },
) {
  const { npi } = await params;

  if (!/^\d{10}$/.test(npi)) {
    return Response.json(
      { erreur: MESSAGES.npiInvalide },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const pageDemandee = Number.parseInt(
    url.searchParams.get("page") ?? "1",
    10,
  );
  const page = Number.isNaN(pageDemandee) ? 1 : pageDemandee;

  try {
    const resultat = await listerRendezVousUsager(npi, page);
    return Response.json(serialiserPage(resultat, maintenantBenin()));
  } catch (erreur) {
    return erreurInterne(erreur);
  }
}

