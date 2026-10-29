/**
 * Types du domaine « rendez-vous au guichet ».
 *
 * Convention de temps : toutes les dates du domaine sont des heures murales
 * du Bénin (GMT+1, sans heure d'été) encodées dans un `Date` dont les
 * accesseurs UTC portent l'heure locale. Autrement dit `2026-11-10 09:00`
 * au Bénin devient `new Date("2026-11-10T09:00:00.000Z")` dans le module.
 * Cette convention rend les règles indépendantes du fuseau de la machine.
 */

export const SERVICES = ["PASSEPORT", "CNI", "PERMIS"] as const;
export type Service = (typeof SERVICES)[number];

export const STATUTS = ["confirme", "honore", "absent", "annule"] as const;
export type Statut = (typeof STATUTS)[number];

/** Statuts définitifs : un rendez-vous clôturé ne peut plus changer. */
export const STATUTS_CLOTURES = ["honore", "absent", "annule"] as const;
export type StatutCloture = (typeof STATUTS_CLOTURES)[number];

/** Statuts qu'un agent peut saisir sur un rendez-vous confirmé. */
export const STATUTS_AGENT = ["honore", "absent"] as const;
export type StatutAgent = (typeof STATUTS_AGENT)[number];

export interface RendezVousExistant {
  id: number;
  npi: string;
  service: Service;
  /** Heure du Bénin encodée en UTC (voir la convention ci-dessus). */
  dateHeure: Date;
  statut: Statut;
}

export interface EntreePriseRendezVous {
  npi: unknown;
  service: unknown;
  dateHeure: unknown;
}

export interface ContextePriseRendezVous {
  /** Heure courante du Bénin, encodée en UTC. */
  maintenant: Date;
  /** Rendez-vous déjà en base (ceux de l'usager et du créneau suffisent). */
  rendezVous: readonly RendezVousExistant[];
}

export interface RendezVousValide {
  npi: string;
  service: Service;
  /** Heure du Bénin encodée en UTC. */
  dateHeure: Date;
}

export function estService(valeur: unknown): valeur is Service {
  return typeof valeur === "string" && (SERVICES as readonly string[]).includes(valeur);
}

export function estStatut(valeur: unknown): valeur is Statut {
  return typeof valeur === "string" && (STATUTS as readonly string[]).includes(valeur);
}
