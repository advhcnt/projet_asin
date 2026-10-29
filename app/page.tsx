import Link from "next/link";
import {
  IconCalendarEvent,
  IconClockHour4,
  IconUserCheck,
} from "@tabler/icons-react";

import { Button } from "@/components/ui/button";

const parcours = [
  {
    href: "/rendez-vous",
    icone: IconCalendarEvent,
    titre: "Prendre rendez-vous",
    description:
      "Choisissez un service et un créneau. Trois usagers maximum par créneau de 30 minutes.",
  },
  {
    href: "/mes-rendez-vous",
    icone: IconClockHour4,
    titre: "Mes rendez-vous",
    description:
      "Consultez votre prochain rendez-vous et annulez-le jusqu'à 24 h avant.",
  },
  {
    href: "/agent",
    icone: IconUserCheck,
    titre: "Guichet",
    description:
      "Pour les agents : la journée du centre et la clôture des rendez-vous.",
  },
];

export default function Page() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex max-w-2xl flex-col gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Étude de cas TMA — DEP / ASIN
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Prenez rendez-vous pour retirer vos documents au guichet.
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Passeport, carte d&apos;identité ou permis de conduire : réservez un
          créneau de 30 minutes dans la semaine, présentez-vous au centre, et
          faites clôturer votre rendez-vous par un agent.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button render={<Link href="/rendez-vous" />}>
            Prendre rendez-vous
          </Button>
          <Button
            variant="outline"
            render={<Link href="/mes-rendez-vous" />}
          >
            Consulter mes rendez-vous
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {parcours.map(({ href, icone: Icone, titre, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-5 transition-colors hover:border-ring/60 hover:bg-muted/40"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:text-foreground">
              <Icone className="size-5" stroke={1.6} />
            </span>
            <span className="text-sm font-medium">{titre}</span>
            <span className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-border/70 bg-muted/30 p-5 text-sm">
        <h2 className="font-medium">Règles du centre</h2>
        <ul className="mt-2 grid gap-1.5 text-muted-foreground sm:grid-cols-2">
          <li>Du lundi au vendredi, 08:00 à 15:30.</li>
          <li>Créneaux de 30 minutes, 3 places par créneau.</li>
          <li>Un seul rendez-vous à venir par usager.</li>
          <li>Annulation possible jusqu&apos;à 24 h avant.</li>
        </ul>
      </section>
    </div>
  );
}
