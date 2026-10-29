import { GuichetJour } from "@/components/rendez-vous/guichet-jour";
import { cleDate, maintenantBenin } from "@/lib/rendez-vous";
import { listerRendezVousDuJour } from "@/lib/rendez-vous/depot";
import { serialiserRendezVous } from "@/lib/rendez-vous/presentation";

export const dynamic = "force-dynamic";

export default async function Page() {
  const maintenant = maintenantBenin();
  const rendezVous = await listerRendezVousDuJour(maintenant);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Guichet du jour
        </h1>
        <p className="text-sm text-muted-foreground">
          Les rendez-vous de la journée, dans l&apos;ordre des créneaux. Un
          rendez-vous confirmé peut être marqué honoré ou absent ; ces statuts
          sont définitifs.
        </p>
      </header>

      <GuichetJour
        dateInitiale={cleDate(maintenant)}
        rendezVousInitiaux={rendezVous.map((rdv) =>
          serialiserRendezVous(rdv, maintenant),
        )}
      />
    </div>
  );
}
