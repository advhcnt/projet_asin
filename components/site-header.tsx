import Link from "next/link";

const liens = [
  { href: "/rendez-vous", label: "Prendre rendez-vous" },
  { href: "/mes-rendez-vous", label: "Mes rendez-vous" },
  { href: "/agent", label: "Guichet" },
  { href: "/demarche", label: "Démarche" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid size-6 place-items-center rounded-md bg-primary text-[11px] text-primary-foreground">
            RB
          </span>
          Rendez-vous au guichet
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-xs sm:text-sm">
          {liens.map((lien) => (
            <Link
              key={lien.href}
              href={lien.href}
              className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {lien.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
