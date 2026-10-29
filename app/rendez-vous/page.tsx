import { FormulaireRendezVous } from "@/components/rendez-vous/formulaire-rendez-vous";
import { cleDate, maintenantBenin } from "@/lib/rendez-vous";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Prendre rendez-vous
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisissez un service, une date ouvrée et un créneau de 30 minutes.
          Trois usagers au plus par créneau et un seul rendez-vous à venir par
          usager.
        </p>
      </header>

      <FormulaireRendezVous dateMin={cleDate(maintenantBenin())} />
    </div>
  );
}
