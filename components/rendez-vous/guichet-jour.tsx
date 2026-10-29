"use client";

import { useState } from "react";

import { StatutBadge } from "@/components/rendez-vous/statut-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RendezVousJson } from "@/lib/rendez-vous/presentation";
import { libelleService } from "@/lib/rendez-vous/libelles";

const STATUTS_AFFICHES: Record<string, string> = {
  confirme: "Confirmés",
  honore: "Honorés",
  absent: "Absents",
  annule: "Annulés",
};

export function GuichetJour({
  dateInitiale,
  rendezVousInitiaux,
}: {
  dateInitiale: string;
  rendezVousInitiaux: RendezVousJson[];
}) {
  const [date, setDate] = useState(dateInitiale);
  const [agent, setAgent] = useState("AG-01");
  const [rendezVous, setRendezVous] =
    useState<RendezVousJson[]>(rendezVousInitiaux);
  const [chargement, setChargement] = useState(false);
  const [traitement, setTraitement] = useState<number | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function charger(jour: string) {
    setChargement(true);
    setErreur(null);

    try {
      const reponse = await fetch(
        `/api/rendez-vous?date=${encodeURIComponent(jour)}`,
      );
      const corps = (await reponse.json()) as
        | { date: string; rendezVous: RendezVousJson[] }
        | { erreur: string };

      if (!reponse.ok || "erreur" in corps) {
        setRendezVous([]);
        setErreur(
          "erreur" in corps
            ? corps.erreur
            : "Impossible de charger la journée.",
        );
        return;
      }

      setRendezVous(corps.rendezVous);
    } catch {
      setRendezVous([]);
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setChargement(false);
    }
  }

  function changerDate(jour: string) {
    setDate(jour);
    setMessage(null);
    if (jour) void charger(jour);
  }

  async function cloturer(id: number, statut: "honore" | "absent") {
    setTraitement(id);
    setErreur(null);
    setMessage(null);

    try {
      const reponse = await fetch(`/api/rendez-vous/${id}/statut`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut, agent }),
      });
      const corps = (await reponse.json()) as
        | RendezVousJson
        | { erreur: string };

      if (!reponse.ok) {
        setErreur(
          "erreur" in corps
            ? corps.erreur
            : "Le changement de statut a été refusé.",
        );
        return;
      }

      setMessage(
        `Rendez-vous n° ${id} marqué ${statut === "honore" ? "honoré" : "absent"}.`,
      );
      await charger(date);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setTraitement(null);
    }
  }

  const compteParStatut = rendezVous.reduce<Record<string, number>>(
    (comptes, rdv) => {
      comptes[rdv.statut] = (comptes[rdv.statut] ?? 0) + 1;
      return comptes;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-5 sm:grid-cols-[1fr_10rem]">
        <div className="grid gap-2">
          <label htmlFor="jour" className="text-sm font-medium">
            Journée du guichet (heure du Bénin)
          </label>
          <Input
            id="jour"
            type="date"
            value={date}
            onChange={(evenement) => changerDate(evenement.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="agent" className="text-sm font-medium">
            Code agent
          </label>
          <Input
            id="agent"
            value={agent}
            maxLength={10}
            onChange={(evenement) => setAgent(evenement.target.value)}
          />
        </div>
      </div>

      {erreur ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {erreur}
        </p>
      ) : null}

      {message ? (
        <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          {message}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">
            {rendezVous.length} rendez-vous
            {chargement ? " (chargement…)" : ""}
          </h2>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {Object.entries(compteParStatut).map(([statut, nombre]) => (
              <span key={statut}>
                {STATUTS_AFFICHES[statut] ?? statut} : {nombre}
              </span>
            ))}
          </div>
        </div>

        {rendezVous.length === 0 && !chargement ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Aucun rendez-vous ce jour-là.
          </p>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
            {rendezVous.map((rdv) => (
              <li
                key={rdv.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    {rdv.dateHeure} — {libelleService(rdv.service)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    NPI {rdv.npi} · n° {rdv.id}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StatutBadge statut={rdv.statut} />
                  {rdv.statut === "confirme" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void cloturer(rdv.id, "honore")}
                        disabled={traitement === rdv.id}
                      >
                        Honoré
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void cloturer(rdv.id, "absent")}
                        disabled={traitement === rdv.id}
                      >
                        Absent
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
