"use client";

import { useState } from "react";

import { StatutBadge } from "@/components/rendez-vous/statut-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PageRendezVousJson } from "@/lib/rendez-vous/presentation";
import { libelleService } from "@/lib/rendez-vous/libelles";

type RendezVousJson = PageRendezVousJson["rendezVous"][number];

export function MesRendezVous({
  npiInitial,
  pageInitiale,
}: {
  npiInitial: string;
  pageInitiale: PageRendezVousJson | null;
}) {
  const [npi, setNpi] = useState(npiInitial);
  const [donnees, setDonnees] = useState<PageRendezVousJson | null>(
    pageInitiale,
  );
  const [chargement, setChargement] = useState(false);
  const [annulationEnCours, setAnnulationEnCours] = useState<number | null>(
    null,
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function charger(npiRecherche: string, pageDemandee: number) {
    setChargement(true);
    setErreur(null);

    try {
      const reponse = await fetch(
        `/api/usagers/${encodeURIComponent(npiRecherche)}/rendez-vous?page=${pageDemandee}`,
      );
      const corps = (await reponse.json()) as
        | PageRendezVousJson
        | { erreur: string };

      if (!reponse.ok || "erreur" in corps) {
        setDonnees(null);
        setErreur(
          "erreur" in corps
            ? corps.erreur
            : "Impossible de charger les rendez-vous.",
        );
        return;
      }

      setDonnees(corps);
    } catch {
      setDonnees(null);
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setChargement(false);
    }
  }

  async function rechercher(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setMessage(null);
    await charger(npi, 1);
  }

  async function annuler(rendezVous: RendezVousJson) {
    const confirme = window.confirm(
      `Annuler le rendez-vous du ${rendezVous.dateHeure} ?`,
    );
    if (!confirme) return;

    setAnnulationEnCours(rendezVous.id);
    setErreur(null);
    setMessage(null);

    try {
      const reponse = await fetch(
        `/api/rendez-vous/${rendezVous.id}/annulation`,
        { method: "POST" },
      );
      const corps = (await reponse.json()) as
        | RendezVousJson
        | { erreur: string };

      if (!reponse.ok) {
        setErreur(
          "erreur" in corps ? corps.erreur : "L'annulation a été refusée.",
        );
        return;
      }

      setMessage(`Rendez-vous n° ${rendezVous.id} annulé.`);
      await charger(npi, donnees?.page ?? 1);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    } finally {
      setAnnulationEnCours(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={rechercher}
        className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 sm:flex-row sm:items-end"
      >
        <div className="grid flex-1 gap-2">
          <label htmlFor="npi-recherche" className="text-sm font-medium">
            NPI de l&apos;usager
          </label>
          <Input
            id="npi-recherche"
            value={npi}
            onChange={(evenement) => setNpi(evenement.target.value)}
            placeholder="0203040506"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <Button type="submit" disabled={chargement || npi.length === 0}>
          {chargement ? "Recherche…" : "Afficher mes rendez-vous"}
        </Button>
      </form>

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

      {donnees ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">
              {donnees.total} rendez-vous
            </h2>
            {donnees.totalPages > 1 ? (
              <p className="text-xs text-muted-foreground">
                Page {donnees.page} sur {donnees.totalPages}
              </p>
            ) : null}
          </div>

          {donnees.rendezVous.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucun rendez-vous pour ce NPI.
            </p>
          ) : (
            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70 bg-card">
              {donnees.rendezVous.map((rendezVous) => (
                <li
                  key={rendezVous.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">
                      {rendezVous.dateHeure} —{" "}
                      {libelleService(rendezVous.service)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      N° {rendezVous.id} · NPI {rendezVous.npi}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatutBadge statut={rendezVous.statut} />
                    {rendezVous.annulable ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void annuler(rendezVous)}
                        disabled={annulationEnCours === rendezVous.id}
                      >
                        {annulationEnCours === rendezVous.id
                          ? "Annulation…"
                          : "Annuler"}
                      </Button>
                    ) : rendezVous.statut === "confirme" ? (
                      <span className="text-[11px] text-muted-foreground">
                        Annulation fermée
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {donnees.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void charger(npi, donnees.page - 1)}
                disabled={donnees.page <= 1 || chargement}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void charger(npi, donnees.page + 1)}
                disabled={donnees.page >= donnees.totalPages || chargement}
              >
                Suivant
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
