/** Messages exacts attendus par le support (section 2 du sujet). */
export const MESSAGES = {
  npiInvalide: "Le NPI doit comporter exactement 10 chiffres.",
  serviceInconnu: "Service inconnu : choisissez PASSEPORT, CNI ou PERMIS.",
  dateInvalide: "Date et heure invalides (format attendu : AAAA-MM-JJTHH:MM).",
  datePassee: "Impossible de prendre un rendez-vous dans le passé.",
  weekEnd: "Le centre est fermé le week-end.",
  creneauInvalide: "Créneau invalide : de 08:00 à 15:30, toutes les 30 minutes.",
  dejaAVenir: "Vous avez déjà un rendez-vous à venir.",
  creneauComplet: "Ce créneau est complet.",
  annulationNonConfirmee: "Ce rendez-vous ne peut plus être annulé.",
  annulationTardive: "Annulation impossible moins de 24 h avant le rendez-vous.",
  statutInconnu: "Statut invalide : honore ou absent.",
  dejaCloture: "Ce rendez-vous est déjà clôturé.",
  rendezVousIntrouvable: "Rendez-vous introuvable.",
} as const;
