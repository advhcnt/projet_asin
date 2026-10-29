import { MesRendezVous } from "@/components/rendez-vous/mes-rendez-vous";
import { maintenantBenin } from "@/lib/rendez-vous";
import { listerRendezVousUsager } from "@/lib/rendez-vous/depot";
import { serialiserPage } from "@/lib/rendez-vous/presentation";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ npi?: string | string[] }>;
}) {
  const parametres = await searchParams;
  const npi =
    typeof parametres.npi === "string"
      ? parametres.npi
      : (parametres.npi?.[0] ?? "");

  const maintenant = maintenantBenin();
  const pageInitiale = /^\d{10}$/.test(npi)
    ? serialiserPage(
        await listerRendezVousUsager(npi, 1, maintenant),
        maintenant,
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Mes rendez-vous
        </h1>
        <p className="text-sm text-muted-foreground">
          Saisissez votre NPI. Le prochain rendez-vous apparaît en tête, puis
          vos rendez-vous passés du plus récent au plus ancien, par pages de 10.
        </p>
      </header>

      <MesRendezVous npiInitial={npi} pageInitiale={pageInitiale} />
    </div>
  );
}
