import { formaterDateHeure, maintenantBenin } from "./dates";
import { estAnnulable, type PageRendezVous } from "./regles";
import type { RendezVousExistant } from "./types";

export interface RendezVousJson {
  id: number;
  npi: string;
  service: string;
  dateHeure: string;
  dateHeureIso: string;
  statut: string;
  annulable: boolean;
}

/** Format de réponse des traces support (dateHeure en `JJ/MM/AAAA HH:MM`). */
export function serialiserRendezVous(
  rendezVous: RendezVousExistant,
  maintenant: Date = maintenantBenin(),
): RendezVousJson {
  return {
    id: rendezVous.id,
    npi: rendezVous.npi,
    service: rendezVous.service,
    dateHeure: formaterDateHeure(rendezVous.dateHeure),
    dateHeureIso: rendezVous.dateHeure.toISOString(),
    statut: rendezVous.statut,
    annulable: estAnnulable(rendezVous, maintenant),
  };
}

export interface PageRendezVousJson {
  page: number;
  parPage: number;
  total: number;
  totalPages: number;
  rendezVous: RendezVousJson[];
}

export function serialiserPage(
  page: PageRendezVous,
  maintenant: Date = maintenantBenin(),
): PageRendezVousJson {
  return {
    page: page.page,
    parPage: page.parPage,
    total: page.total,
    totalPages: page.totalPages,
    rendezVous: page.elements.map((rdv) =>
      serialiserRendezVous(rdv, maintenant),
    ),
  };
}
