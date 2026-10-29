import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans } from "next/font/google";

import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Rendez-vous au guichet — ASIN",
  description:
    "Prise de rendez-vous en ligne pour le retrait d'un passeport, d'une carte d'identité ou d'un permis de conduire.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        ibmPlexSans.variable,
      )}
    >
      <body className="min-h-svh">
        <ThemeProvider>
          <div className="flex min-h-svh flex-col">
            <SiteHeader />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
              {children}
            </main>
            <footer className="border-t border-border/70 py-4">
              <p className="mx-auto w-full max-w-5xl px-4 text-xs text-muted-foreground">
                Heures du Bénin (GMT+1) — centre ouvert du lundi au vendredi, de
                08:00 à 15:30.
              </p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
