import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Démarche et corrections — Rendez-vous au guichet",
  description:
    "Méthode de traitement des tickets TMA-101 à TMA-107, diagnostic et correction de chaque anomalie.",
};

const etapes = [
  {
    titre: "Lire les règles",
    texte:
      "Les règles de la section 2 font référence, même lorsqu’un ticket signale un comportement conforme. Chaque décision cite la règle appliquée.",
  },
  {
    titre: "Qualifier",
    texte:
      "Chaque trace est confrontée aux règles : six tickets sont des anomalies, TMA-107 est conforme car un rendez-vous est déjà à venir.",
  },
  {
    titre: "Diagnostiquer",
    texte:
      "La cause probable est déduite de la trace et des données de l’export : bornes, calcul de durée, tri, contrôle absent ou transition non gardée.",
  },
  {
    titre: "Corriger",
    texte:
      "Les règles sont réécrites dans un module pur, sans base ni framework, avec l’heure courante injectée. La persistance ne contient aucune règle métier.",
  },
  {
    titre: "Tester",
    texte:
      "Chaque ticket est rejoué par un test automatisé, ticket conforme compris, avec les cas limites du sujet : week-end, grille, capacité, 24 h, statuts.",
  },
  {
    titre: "Mesurer",
    texte:
      "Trois requêtes SQL mesurent l’impact sur l’export : week-ends, créneaux surchargés et transitions depuis un statut annulé.",
  },
];

interface Ticket {
  id: string;
  verdict: "Anomalie" | "Conforme";
  titre: string;
  regle: string;
  trace: string;
  cause: string;
  correction: string;
  test: string;
}

const tickets: Ticket[] = [
  {
    id: "TMA-101",
    verdict: "Anomalie",
    titre: "Un rendez-vous un samedi",
    regle: "Le centre reçoit du lundi au vendredi.",
    trace:
      "Le 14/11/2026 à 10:00 est un samedi ; l’API a répondu 201 et le rendez-vous n° 742 est resté confirmé.",
    cause:
      "Le contrôle vérifie le format et le caractère passé de la date, mais jamais le jour de la semaine.",
    correction:
      "validerEntree() refuse samedi et dimanche avec 409 « Le centre est fermé le week-end. »",
    test:
      "Le cas de la trace, plus le dimanche. L’export contient 8 rendez-vous de week-end, tous des samedis.",
  },
  {
    id: "TMA-102",
    verdict: "Anomalie",
    titre: "Quatre usagers sur un créneau de trois places",
    regle: "Un créneau accueille au plus 3 usagers ; une annulation libère sa place.",
    trace:
      "Les n° 632, 644 et 681 occupent le 10/11/2026 à 09:00 ; le n° 697 est accepté ensuite, soit quatre rendez-vous.",
    cause:
      "Les créations sont espacées de plusieurs jours (28/10, 30/10, 02/11, puis 04/11) : ce n’est pas une course. Le contrôle est simplement trop permissif, du type count > 3 au lieu de count >= 3.",
    correction:
      "controlerDisponibilites() compte les rendez-vous non annulés et refuse dès le 4e. La création est transactionnelle en Serializable, avec nouvelle tentative en cas de conflit.",
    test:
      "4e refusé, 3e accepté, place libérée par une annulation. Test HTTP : 5 demandes simultanées donnent 3 créations et 2 refus.",
  },
  {
    id: "TMA-103",
    verdict: "Anomalie",
    titre: "Une lettre dans le NPI",
    regle: "Un NPI est composé d’exactement 10 chiffres.",
    trace:
      "Le NPI 06142A3647 provoque une réponse 500 « Erreur interne du serveur » au lieu d’un refus explicite.",
    cause:
      "La validation ne porte que sur la longueur, puis la conversion en nombre produit NaN ou une erreur SQL non interceptée.",
    correction:
      "Expression régulière ^\\d{10}$ avant tout accès à la base, réponse 400 avec le message exact « Le NPI doit comporter exactement 10 chiffres. »",
    test:
      "Le NPI de la trace, plus les cas trop court, trop long et vide.",
  },
  {
    id: "TMA-104",
    verdict: "Anomalie",
    titre: "Annulation refusée à 40 heures",
    regle: "L’usager peut annuler jusqu’à 24 heures avant l’heure prévue.",
    trace:
      "Le 17/11/2026 à 18:00, l’annulation du rendez-vous du 19/11 à 10:00 est refusée alors qu’il reste 40 heures.",
    cause:
      "Le seuil ou la comparaison de durée est faux : seuil à 48 h, signe inversé ou comparaison de jours calendaires sans l’heure.",
    correction:
      "controlerAnnulation() autorise si dateHeure - maintenant >= 24 h, égalité comprise, et refuse en dessous.",
    test:
      "17/11 18:00 accepté, 24 h pile accepté, 23 h 59 refusé.",
  },
  {
    id: "TMA-105",
    verdict: "Anomalie",
    titre: "Un rendez-vous annulé repassé en honoré",
    regle: "Un rendez-vous confirmé devient honoré, absent ou annulé ; ces trois statuts sont définitifs.",
    trace:
      "PATCH /292/statut { statut: honore } sur un rendez-vous annulé répond 200. L’historique n° 676 contient annule → honore.",
    cause:
      "Le code valide uniquement le statut demandé (honore ou absent) sans vérifier que le statut courant est confirmé.",
    correction:
      "controlerChangementStatut() vérifie la cible (400 si inconnue), puis exige le statut confirmé (409 « Ce rendez-vous est déjà clôturé. »). L’écriture et l’historique sont transactionnels.",
    test:
      "annule → honore refusé, honore/absent → autre refusé, cible invalide refusée, confirmé → honoré/absent accepté.",
  },
  {
    id: "TMA-106",
    verdict: "Anomalie",
    titre: "Le prochain rendez-vous absent de la première page",
    regle: "Les rendez-vous sont listés du plus récent au plus ancien, le prochain en tête, par pages de 10.",
    trace:
      "La page 1 renvoie 9 dates dans l’ordre 28/07, 25/09, 21/04, 19/05, 16/06, 12/02, 11/08, 08/05, 07/07 ; le rendez-vous du 02/12 n’apparaît pas.",
    cause:
      "Tri lexicographique décroissant sur la date formatée JJ/MM/AAAA : les 9 dates de la trace sont exactement les 9 plus grandes chaînes de la série, et 02/12 commence par « 02 ».",
    correction:
      "trierEtPaginer() trie la liste complète sur le timestamp, place le prochain confirmé à venir en tête, puis découpe 10 par page.",
    test:
      "Page 1 = 10 éléments avec le n° 826 (02/12) en tête, ordre exact des 9 suivants, page 2 = 3 éléments, aucun doublon.",
  },
  {
    id: "TMA-107",
    verdict: "Conforme",
    titre: "Deuxième rendez-vous à venir",
    regle: "Un usager ne peut avoir qu’un seul rendez-vous à venir, tous services confondus.",
    trace:
      "Le NPI 0102030405 a déjà le rendez-vous n° 800 le 26/11 à 10:00 ; la demande d’un PERMIS le 27/11 est refusée.",
    cause:
      "Aucune anomalie : le service différent ne crée pas d’exception à la règle d’unicité.",
    correction:
      "Aucune correction. Le module conserve ce refus et autorise une nouvelle prise après clôture du rendez-vous précédent.",
    test:
      "Le cas de la trace, puis la prise acceptée une fois le rendez-vous précédent honoré.",
  },
];

const impacts = [
  {
    titre: "Week-ends confirmés à venir",
    valeur: "5",
    detail:
      "N° 680, 730, 834, 857 et 874, du samedi 21/11 au samedi 12/12. Le n° 742 de la trace est déjà passé à la date de l’export.",
  },
  {
    titre: "Créneaux à plus de 3 non annulés",
    valeur: "3",
    detail:
      "22/10 10:30 (502, 511, 517, 519) · 10/11 09:00 (632, 644, 681, 697) · 24/11 14:00 (728, 750, 763, 783).",
  },
  {
    titre: "Transitions depuis « annulé »",
    valeur: "4",
    detail:
      "N° 208 et 231 → honoré, n° 262 → absent, n° 292 → honoré. Trois anomalies que le ticket TMA-105 ne signalait pas.",
  },
];

const bonus = [
  "8 rendez-vous de week-end, tous des samedis, dont le n° 715 le même jour que le 742 signalé.",
  "3 créneaux en surcapacité, alors qu’un seul était signalé par le chef de centre.",
  "4 transitions depuis « annulé », dont 3 non signalées.",
  "2 NPI stockés non conformes : n° 459 (11 chiffres) et n° 642 (12 chiffres).",
  "3 horaires hors grille : n° 490 et 842 à 16:00, n° 698 à 16:30.",
  "3 rendez-vous confirmés jamais clôturés après leur date : n° 475, 742 et 715 ; défaut d’exploitation, sans règle de clôture automatique dans le sujet.",
];

export default function Page() {
  return (
    <div className="flex flex-col gap-10">
      <header className="flex max-w-3xl flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Étude de cas TMA — DEP / ASIN
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Démarche et corrections
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Le code d’origine n’était pas fourni : le travail part des règles de la
          section 2, des traces du support et de l’export du 20/11/2026 à 18:00
          (heure du Bénin). Le cœur du rendu est un module de règles pur, testé
          ticket par ticket ; l’API et les écrans ne font que l’exécuter.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">La méthode</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {etapes.map((etape, index) => (
            <li
              key={etape.titre}
              className="flex gap-3 rounded-xl border border-border/70 bg-card p-4"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{etape.titre}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {etape.texte}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">
            Les sept tickets
          </h2>
          <p className="text-xs text-muted-foreground">
            6 anomalies · 1 comportement conforme
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Dépliez chaque ticket pour voir la règle, la trace, la cause, la
          correction et le test associé.
        </p>

        <div className="flex flex-col gap-2">
          {tickets.map((ticket) => (
            <details
              key={ticket.id}
              open={ticket.id === "TMA-101"}
              className="group rounded-xl border border-border/70 bg-card open:border-ring/50"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {ticket.id}
                  </span>
                  <span className="text-sm font-medium">{ticket.titre}</span>
                </span>
                <span
                  className={
                    ticket.verdict === "Conforme"
                      ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400"
                      : "rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                  }
                >
                  {ticket.verdict}
                </span>
              </summary>

              <dl className="grid gap-3 border-t border-border/70 p-4 text-sm sm:grid-cols-[7.5rem_1fr]">
                <dt className="text-xs font-medium text-muted-foreground">
                  Règle
                </dt>
                <dd className="leading-relaxed">{ticket.regle}</dd>

                <dt className="text-xs font-medium text-muted-foreground">
                  Trace
                </dt>
                <dd className="leading-relaxed">{ticket.trace}</dd>

                <dt className="text-xs font-medium text-muted-foreground">
                  Cause
                </dt>
                <dd className="leading-relaxed">{ticket.cause}</dd>

                <dt className="text-xs font-medium text-muted-foreground">
                  Correction
                </dt>
                <dd className="leading-relaxed">{ticket.correction}</dd>

                <dt className="text-xs font-medium text-muted-foreground">
                  Test
                </dt>
                <dd className="leading-relaxed">{ticket.test}</dd>
              </dl>
            </details>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Mesure d’impact
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Les trois requêtes de <code className="font-mono text-xs">requetes.sql</code>{" "}
          ont été exécutées sur la base importée, à l’instant de l’export.
          Résultats :
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {impacts.map((impact) => (
            <div
              key={impact.titre}
              className="flex flex-col gap-2 rounded-xl border border-border/70 bg-card p-4"
            >
              <span className="text-2xl font-semibold">{impact.valeur}</span>
              <span className="text-sm font-medium">{impact.titre}</span>
              <span className="text-xs leading-relaxed text-muted-foreground">
                {impact.detail}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Anomalies trouvées en plus
        </h2>
        <ul className="grid gap-2 rounded-xl border border-border/70 bg-muted/30 p-5 text-sm sm:grid-cols-2">
          {bonus.map((element) => (
            <li key={element} className="flex gap-2 leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{element}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Vérifications</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-400">
            31 tests automatisés
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            typecheck OK
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            lint OK
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            build OK
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            5 demandes concurrentes → 3 créations
          </span>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card p-5">
        <p className="mr-auto text-sm font-medium">
          Rejouer les parcours dans l’application
        </p>
        <Button render={<Link href="/rendez-vous" />}>
          Prendre rendez-vous
        </Button>
        <Button
          variant="outline"
          render={<Link href="/mes-rendez-vous?npi=0203040506" />}
        >
          Un usager avec 13 rendez-vous
        </Button>
        <Button variant="outline" render={<Link href="/agent" />}>
          Guichet
        </Button>
      </section>
    </div>
  );
}
