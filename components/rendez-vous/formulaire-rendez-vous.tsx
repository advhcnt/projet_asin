"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SERVICES, type Service } from "@/lib/rendez-vous/types";
import { LIBELLES_SERVICE } from "@/lib/rendez-vous/libelles";

interface Creneau {
  heure: string;
  dateHeure: string;
  occupants: number;
  disponible: boolean;
}

interface ReponseDisponibilites {
  date: string;
  ferme: boolean;
  creneaux: Creneau[];
}

interface RendezVousCree {
  id: number;
  npi: string;
  service: string;
  dateHeure: string;
  statut: string;
}

const HEURES = Array.from({ length: 16 }, (_, index) => {
  const minutes = 8 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
});

export function FormulaireRendezVous({ dateMin }: { dateMin: string }) {
  const [npi, setNpi] = useState("");
  const [service, setService] = useState<Service>("PASSEPORT");
  const [date, setDate] = useState("");
  const [heure, setHeure] = useState("");
  const [disponibilites, setDisponibilites] =
    useState<ReponseDisponibilites | null>(null);
  const [chargementCreneaux, setChargementCreneaux] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<RendezVousCree | null>(null);
  const requeteCreneaux = useRef<AbortController | null>(null);

  // Annule la requête en cours au démontage (pas de setState dans l'effet).
  useEffect(() => () => requeteCreneaux.current?.abort(), []);

  async function chargerCreneaux(jour: string) {
    requeteCreneaux.current?.abort();

    if (!jour) {
      setDisponibilites(null);
      setChargementCreneaux(false);
      return;
    }

    const controleur = new AbortController();
    requeteCreneaux.current = controleur;
    setChargementCreneaux(true);
    setErreur(null);

    try {
      const reponse = await fetch(
        `/api/creneaux?date=${encodeURIComponent(jour)}`,
        { signal: controleur.signal },
      );
      const corps = (await reponse.json()) as
        | ReponseDisponibilites
        | { erreur: string };

      if (!reponse.ok || "erreur" in corps) {
        throw new Error(
          "erreur" in corps
            ? corps.erreur
            : "Impossible de charger les créneaux.",
        );
      }

      setDisponibilites(corps);
      setHeure((actuelle) =>
        corps.creneaux.some((c) => c.heure === actuelle && c.disponible)
          ? actuelle
          : "",
      );
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setDisponibilites(null);
      setErreur(
        cause instanceof Error ? cause.message : "Erreur de chargement.",
      );
    } finally {
      if (requeteCreneaux.current === controleur) {
        setChargementCreneaux(false);
      }
    }
  }

  function changerDate(jour: string) {
    setDate(jour);
    setHeure("");
    void chargerCreneaux(jour);
  }

  const creneauxAffiches: Creneau[] =
    disponibilites?.creneaux ??
    HEURES.map((valeur) => ({
      heure: valeur,
      dateHeure: "",
      occupants: 0,
      disponible: true,
    }));

  async function soumettre(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setErreur(null);
    setConfirmation(null);
    setEnvoi(true);

    try {
      const reponse = await fetch("/api/rendez-vous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npi,
          service,
          dateHeure: `${date}T${heure}`,
        }),
      });
      const corps = (await reponse.json()) as
        | RendezVousCree
        | { erreur: string };

      if (!reponse.ok) {
        setErreur(
          "erreur" in corps ? corps.erreur : "La demande a été refusée.",
        );
        return;
      }

      setConfirmation(corps as RendezVousCree);
      setNpi("");
      setHeure("");
    } catch {
      setErreur("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={soumettre}
        className="grid gap-5 rounded-xl border border-border/70 bg-card p-5 sm:p-6"
      >
        <div className="grid gap-2">
          <label htmlFor="npi" className="text-sm font-medium">
            NPI
          </label>
          <Input
            id="npi"
            name="npi"
            value={npi}
            onChange={(evenement) => setNpi(evenement.target.value)}
            placeholder="0614253647"
            inputMode="numeric"
            autoComplete="off"
            required
            aria-invalid={erreur?.startsWith("Le NPI") || undefined}
          />
          <p className="text-xs text-muted-foreground">
            10 chiffres, sans espace.
          </p>
        </div>

        <div className="grid gap-2">
          <label htmlFor="service" className="text-sm font-medium">
            Service
          </label>
          <Select
            id="service"
            name="service"
            value={service}
            onChange={(evenement) =>
              setService(evenement.target.value as Service)
            }
          >
            {SERVICES.map((code) => (
              <option key={code} value={code}>
                {LIBELLES_SERVICE[code]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm font-medium">
              Date
            </label>
            <Input
              id="date"
              name="date"
              type="date"
              min={dateMin}
              value={date}
              onChange={(evenement) => changerDate(evenement.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="heure" className="text-sm font-medium">
              Heure
            </label>
            <Select
              id="heure"
              name="heure"
              value={heure}
              onChange={(evenement) => setHeure(evenement.target.value)}
              required
              disabled={!date || chargementCreneaux || disponibilites?.ferme}
            >
              <option value="">
                {chargementCreneaux ? "Chargement…" : "Choisir un créneau"}
              </option>
              {creneauxAffiches.map((creneau) => (
                <option
                  key={creneau.heure}
                  value={creneau.heure}
                  disabled={!creneau.disponible}
                >
                  {creneau.heure}
                  {creneau.disponible
                    ? ` — ${3 - creneau.occupants} place(s)`
                    : creneau.occupants > 0
                      ? " — complet"
                      : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {disponibilites?.ferme ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            Le centre est fermé le week-end.
          </p>
        ) : null}

        {erreur ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {erreur}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={envoi || !npi || !date || !heure}>
            {envoi ? "Enregistrement…" : "Confirmer le rendez-vous"}
          </Button>
          <span className="text-xs text-muted-foreground">
            Le rendez-vous est confirmé immédiatement.
          </span>
        </div>
      </form>

      {confirmation ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Rendez-vous confirmé (n° {confirmation.id})
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {LIBELLES_SERVICE[confirmation.service as Service] ??
              confirmation.service}{" "}
            le {confirmation.dateHeure}, pour le NPI {confirmation.npi}.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            render={<Link href={`/mes-rendez-vous?npi=${confirmation.npi}`} />}
          >
            Voir mes rendez-vous
          </Button>
        </div>
      ) : null}
    </div>
  );
}
