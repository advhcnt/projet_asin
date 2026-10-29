/**
 * Utilitaires de dates « heure du Bénin ».
 *
 * Le Bénin est à GMT+1 toute l'année. Les dates manipulées par le domaine
 * sont des heures murales encodées en UTC (voir types.ts) : aucun appel à
 * l'heure locale de la machine n'est fait, les tests sont donc déterministes.
 */

const OFFSET_BENIN_MS = 60 * 60 * 1000;
const FORMAT_DATE_HEURE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const FORMAT_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const deuxChiffres = (valeur: number) => String(valeur).padStart(2, "0");

/** Convertit un instant réel (ex. `new Date()`) en heure murale du Bénin. */
export function maintenantBenin(instant: Date = new Date()): Date {
  return new Date(instant.getTime() + OFFSET_BENIN_MS);
}

/** Convertit une heure murale du Bénin en instant réel (UTC). */
export function instantDepuisHeureBenin(dateBenin: Date): Date {
  return new Date(dateBenin.getTime() - OFFSET_BENIN_MS);
}

function construireDate(
  annee: number,
  mois: number,
  jour: number,
  heure = 0,
  minute = 0,
): Date | null {
  if (annee < 1) return null;
  const date = new Date(0);
  date.setUTCFullYear(annee, mois - 1, jour);
  date.setUTCHours(heure, minute, 0, 0);
  if (
    date.getUTCFullYear() !== annee ||
    date.getUTCMonth() !== mois - 1 ||
    date.getUTCDate() !== jour ||
    date.getUTCHours() !== heure ||
    date.getUTCMinutes() !== minute
  ) {
    return null;
  }
  return date;
}

/**
 * Analyse une saisie `AAAA-MM-JJTHH:MM`. Retourne `null` si la chaîne est
 * mal formée ou si la date n'existe pas (ex. 2026-02-31).
 */
export function parserDateHeureBenin(valeur: unknown): Date | null {
  if (typeof valeur !== "string") return null;
  const correspondance = FORMAT_DATE_HEURE.exec(valeur);
  if (!correspondance) return null;
  const [, annee, mois, jour, heure, minute] = correspondance;
  return construireDate(
    Number(annee),
    Number(mois),
    Number(jour),
    Number(heure),
    Number(minute),
  );
}

/** Analyse une date `AAAA-MM-JJ` (minuit, heure du Bénin). */
export function parserDateBenin(valeur: unknown): Date | null {
  if (typeof valeur !== "string") return null;
  const correspondance = FORMAT_DATE.exec(valeur);
  if (!correspondance) return null;
  const [, annee, mois, jour] = correspondance;
  return construireDate(Number(annee), Number(mois), Number(jour));
}

/**
 * Construit une heure du Bénin (`AAAA-MM-JJTHH:MM`) pour appeler le module.
 * Contrairement à `parserDateHeureBenin`, une saisie invalide lève une erreur
 * explicite : c'est la forme recommandée dans les tests et par le jury.
 */
export function heureBenin(valeur: string): Date {
  const date = parserDateHeureBenin(valeur);
  if (!date) {
    throw new Error(
      `Heure du Bénin invalide : « ${valeur} » (attendu AAAA-MM-JJTHH:MM).`,
    );
  }
  return date;
}

/** `14/11/2026 10:00` */
export function formaterDateHeure(date: Date): string {
  return `${deuxChiffres(date.getUTCDate())}/${deuxChiffres(
    date.getUTCMonth() + 1,
  )}/${date.getUTCFullYear()} ${deuxChiffres(date.getUTCHours())}:${deuxChiffres(
    date.getUTCMinutes(),
  )}`;
}

/** `14/11/2026` */
export function formaterDate(date: Date): string {
  return `${deuxChiffres(date.getUTCDate())}/${deuxChiffres(
    date.getUTCMonth() + 1,
  )}/${date.getUTCFullYear()}`;
}

/** `10:00` */
export function formaterHeure(date: Date): string {
  return `${deuxChiffres(date.getUTCHours())}:${deuxChiffres(date.getUTCMinutes())}`;
}

/** `2026-11-14`, utilisable dans un `<input type="date">` ou une URL. */
export function cleDate(date: Date): string {
  return `${date.getUTCFullYear()}-${deuxChiffres(date.getUTCMonth() + 1)}-${deuxChiffres(
    date.getUTCDate(),
  )}`;
}

/** Samedi (6) ou dimanche (0). */
export function estWeekEnd(date: Date): boolean {
  const jour = date.getUTCDay();
  return jour === 0 || jour === 6;
}

const OUVERTURE_MINUTES = 8 * 60;
const FERMETURE_MINUTES = 15 * 60 + 30;

/** Vrai si l'heure tombe sur la grille 08:00 → 15:30 par pas de 30 min. */
export function estDansLaGrille(date: Date): boolean {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (
    minutes >= OUVERTURE_MINUTES &&
    minutes <= FERMETURE_MINUTES &&
    minutes % 30 === 0
  );
}

/** Minuit du jour demandé. */
export function debutDeJournee(date: Date): Date {
  const debut = new Date(date);
  debut.setUTCHours(0, 0, 0, 0);
  return debut;
}

/** Minuit du lendemain (borne exclue). */
export function finDeJournee(date: Date): Date {
  return new Date(debutDeJournee(date).getTime() + 24 * 60 * 60 * 1000);
}
