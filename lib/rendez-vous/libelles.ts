import type { Service, Statut } from "./types";

export const LIBELLES_SERVICE: Record<Service, string> = {
  PASSEPORT: "Retrait de passeport",
  CNI: "Carte d'identité",
  PERMIS: "Permis de conduire",
};

export const LIBELLES_STATUT: Record<Statut, string> = {
  confirme: "Confirmé",
  honore: "Honoré",
  absent: "Absent",
  annule: "Annulé",
};

export function libelleService(service: string): string {
  return LIBELLES_SERVICE[service as Service] ?? service;
}

export function libelleStatut(statut: string): string {
  return LIBELLES_STATUT[statut as Statut] ?? statut;
}
