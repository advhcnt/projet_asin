import { libelleStatut } from "@/lib/rendez-vous/libelles";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  confirme: "bg-primary/10 text-primary",
  honore: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  absent: "bg-destructive/10 text-destructive",
  annule: "bg-muted text-muted-foreground",
};

export function StatutBadge({ statut }: { statut: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[statut] ?? "bg-muted text-muted-foreground",
      )}
    >
      {libelleStatut(statut)}
    </span>
  );
}
