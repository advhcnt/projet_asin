import { describe, expect, it } from "vitest";

import {
  controlerAnnulation,
  controlerChangementStatut,
  controlerPriseRendezVous,
  estAnnulable,
  MESSAGES,
  trierEtPaginer,
  type RendezVousExistant,
} from "@/lib/rendez-vous";

/** Heure du Bénin encodée en UTC, convention du module. */
function benin(valeur: string): Date {
  return new Date(`${valeur}:00.000Z`);
}

const MAINTENANT = benin("2026-11-20T18:00");

function rdv(
  valeurs: Partial<Omit<RendezVousExistant, "dateHeure">> & {
    id: number;
    dateHeure: string;
  },
): RendezVousExistant {
  const { dateHeure, ...reste } = valeurs;
  return {
    npi: "0203040506",
    service: "PASSEPORT",
    statut: "confirme",
    ...reste,
    dateHeure: benin(dateHeure),
  };
}

describe("TMA-101 — rendez-vous un samedi", () => {
  it("refuse un rendez-vous le samedi 14/11/2026 à 10:00 (week-end)", () => {
    const resultat = controlerPriseRendezVous(
      {
        npi: "0614253647",
        service: "PASSEPORT",
        dateHeure: "2026-11-14T10:00",
      },
      { maintenant: benin("2026-11-09T23:59"), rendezVous: [] },
    );

    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe(MESSAGES.weekEnd);
    expect(resultat.message).toBe("Le centre est fermé le week-end.");
  });

  it("refuse aussi le dimanche", () => {
    const resultat = controlerPriseRendezVous(
      { npi: "0614253647", service: "CNI", dateHeure: "2026-11-15T10:00" },
      { maintenant: benin("2026-11-09T23:59"), rendezVous: [] },
    );
    expect(resultat.ok).toBe(false);
  });
});

describe("TMA-102 — quatre usagers sur un créneau de trois places", () => {
  // Les rendez-vous 632, 644 et 681 occupent déjà le 10/11/2026 à 09:00.
  const occupants = [
    rdv({ id: 632, npi: "0638958971", dateHeure: "2026-11-10T09:00", statut: "honore" }),
    rdv({ id: 644, npi: "0671968463", service: "CNI", dateHeure: "2026-11-10T09:00", statut: "honore" }),
    rdv({ id: 681, npi: "0609394161", service: "PERMIS", dateHeure: "2026-11-10T09:00", statut: "honore" }),
  ];

  it("refuse le 4e rendez-vous du créneau déjà complet", () => {
    const resultat = controlerPriseRendezVous(
      { npi: "0620214467", service: "PERMIS", dateHeure: "2026-11-10T09:00" },
      { maintenant: benin("2026-11-04T23:43"), rendezVous: occupants },
    );

    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe("Ce créneau est complet.");
  });

  it("accepte le 3e rendez-vous du créneau", () => {
    const resultat = controlerPriseRendezVous(
      { npi: "0999999999", service: "PERMIS", dateHeure: "2026-11-10T09:00" },
      { maintenant: benin("2026-11-04T23:43"), rendezVous: occupants.slice(0, 2) },
    );
    expect(resultat.ok).toBe(true);
  });

  it("libère la place d'un rendez-vous annulé", () => {
    const avecAnnule = occupants.map((r) =>
      r.id === 681 ? { ...r, statut: "annule" as const } : r,
    );
    const resultat = controlerPriseRendezVous(
      { npi: "0620214467", service: "PERMIS", dateHeure: "2026-11-10T09:00" },
      { maintenant: benin("2026-11-04T23:43"), rendezVous: avecAnnule },
    );
    expect(resultat.ok).toBe(true);
  });
});

describe("TMA-103 — NPI contenant une lettre", () => {
  it("refuse proprement un NPI de 10 caractères dont une lettre", () => {
    const resultat = controlerPriseRendezVous(
      {
        npi: "06142A3647",
        service: "CNI",
        dateHeure: "2026-11-23T09:00",
      },
      { maintenant: benin("2026-11-16T10:00"), rendezVous: [] },
    );

    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(400);
    expect(resultat.message).toBe("Le NPI doit comporter exactement 10 chiffres.");
  });

  it("refuse un NPI trop court ou trop long", () => {
    for (const npi of ["123456789", "12345678901", ""]) {
      const resultat = controlerPriseRendezVous(
        { npi, service: "CNI", dateHeure: "2026-11-23T09:00" },
        { maintenant: benin("2026-11-16T10:00"), rendezVous: [] },
      );
      expect(resultat.ok).toBe(false);
    }
  });
});

describe("TMA-104 — annulation 40 h avant le rendez-vous", () => {
  const rdv709 = rdv({
    id: 709,
    npi: "0339205992",
    service: "PERMIS",
    dateHeure: "2026-11-19T10:00",
  });

  it("autorise l'annulation le 17/11 à 18:00 pour un rendez-vous le 19/11 à 10:00", () => {
    const resultat = controlerAnnulation(rdv709, benin("2026-11-17T18:00"));
    expect(resultat.ok).toBe(true);
  });

  it("autorise une annulation à exactement 24 h de l'heure prévue", () => {
    expect(controlerAnnulation(rdv709, benin("2026-11-18T10:00")).ok).toBe(true);
  });

  it("refuse une annulation à 23 h 59 du rendez-vous", () => {
    const resultat = controlerAnnulation(rdv709, benin("2026-11-18T10:01"));
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe(
      "Annulation impossible moins de 24 h avant le rendez-vous.",
    );
  });

  it("expose le caractère annulable pour l'affichage", () => {
    expect(estAnnulable(rdv709, benin("2026-11-17T18:00"))).toBe(true);
    expect(estAnnulable(rdv709, benin("2026-11-18T18:00"))).toBe(false);
  });
});

describe("TMA-105 — rendez-vous annulé repassé en honoré", () => {
  it("refuse honore sur un rendez-vous déjà annulé", () => {
    const annule = rdv({
      id: 292,
      npi: "0330677555",
      dateHeure: "2026-11-12T10:00",
      statut: "annule",
    });

    const resultat = controlerChangementStatut(annule, "honore");
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe("Ce rendez-vous est déjà clôturé.");
  });

  it("refuse aussi sur un rendez-vous déjà honoré ou absent", () => {
    for (const statut of ["honore", "absent"] as const) {
      const resultat = controlerChangementStatut(
        rdv({ id: 1, dateHeure: "2026-09-01T09:00", statut }),
        "absent",
      );
      expect(resultat.ok).toBe(false);
    }
  });

  it("accepte honoré et absent sur un rendez-vous confirmé", () => {
    for (const statut of ["honore", "absent"] as const) {
      const resultat = controlerChangementStatut(
        rdv({ id: 2, dateHeure: "2026-11-25T09:00" }),
        statut,
      );
      expect(resultat.ok).toBe(true);
    }
  });

  it("refuse un statut inconnu avec le message prévu", () => {
    const resultat = controlerChangementStatut(
      rdv({ id: 3, dateHeure: "2026-11-25T09:00" }),
      "confirme",
    );
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(400);
    expect(resultat.message).toBe("Statut invalide : honore ou absent.");
  });
});

describe("TMA-106 — prochain rendez-vous absent de la première page", () => {
  // Les 13 rendez-vous de l'usager 0203040506 dans l'export.
  const rendezVous: RendezVousExistant[] = [
    rdv({ id: 1, dateHeure: "2026-01-05T08:30", statut: "honore" }),
    rdv({ id: 2, dateHeure: "2026-02-12T10:00", statut: "honore" }),
    rdv({ id: 3, dateHeure: "2026-03-03T14:30", statut: "absent" }),
    rdv({ id: 4, dateHeure: "2026-04-21T09:00", statut: "honore" }),
    rdv({ id: 5, dateHeure: "2026-05-08T11:30", statut: "honore" }),
    rdv({ id: 6, dateHeure: "2026-05-19T15:00", statut: "absent" }),
    rdv({ id: 7, dateHeure: "2026-06-02T08:00", statut: "honore" }),
    rdv({ id: 8, dateHeure: "2026-06-16T13:30", statut: "honore" }),
    rdv({ id: 9, dateHeure: "2026-07-07T10:30", statut: "honore" }),
    rdv({ id: 10, dateHeure: "2026-07-28T09:30", statut: "absent" }),
    rdv({ id: 11, dateHeure: "2026-08-11T14:00", statut: "honore" }),
    rdv({ id: 259, dateHeure: "2026-09-25T11:00", statut: "honore" }),
    rdv({ id: 826, dateHeure: "2026-12-02T08:30", statut: "confirme" }),
  ];

  it("met le rendez-vous du 02/12/2026 en tête de la page 1", () => {
    const page = trierEtPaginer(rendezVous, {
      page: 1,
      maintenant: MAINTENANT,
    });

    expect(page.total).toBe(13);
    expect(page.parPage).toBe(10);
    expect(page.elements).toHaveLength(10);
    expect(page.elements[0]?.id).toBe(826);
    expect(page.elements[0]?.dateHeure).toEqual(benin("2026-12-02T08:30"));
  });

  it("trie le reste du plus récent au plus ancien", () => {
    const page = trierEtPaginer(rendezVous, {
      page: 1,
      maintenant: MAINTENANT,
    });

    expect(page.elements.slice(1).map((r) => r.id)).toEqual([
      259, 11, 10, 9, 8, 7, 6, 5, 4,
    ]);
  });

  it("renvoie les 3 derniers rendez-vous sur la page 2", () => {
    const page = trierEtPaginer(rendezVous, {
      page: 2,
      maintenant: MAINTENANT,
    });

    expect(page.totalPages).toBe(2);
    expect(page.elements.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("ne duplique ni n'oublie aucun rendez-vous entre les pages", () => {
    const page1 = trierEtPaginer(rendezVous, { page: 1, maintenant: MAINTENANT });
    const page2 = trierEtPaginer(rendezVous, { page: 2, maintenant: MAINTENANT });
    const ids = [...page1.elements, ...page2.elements].map((r) => r.id);

    expect(new Set(ids).size).toBe(13);
  });
});

describe("TMA-107 — deuxième rendez-vous à venir (comportement conforme)", () => {
  it("refuse un PERMIS car un PASSEPORT est déjà à venir", () => {
    const dejaPrevu = rdv({
      id: 800,
      npi: "0102030405",
      dateHeure: "2026-11-26T10:00",
    });

    const resultat = controlerPriseRendezVous(
      {
        npi: "0102030405",
        service: "PERMIS",
        dateHeure: "2026-11-27T09:00",
      },
      { maintenant: benin("2026-11-20T18:00"), rendezVous: [dejaPrevu] },
    );

    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe("Vous avez déjà un rendez-vous à venir.");
  });

  it("accepte un nouveau rendez-vous une fois le précédent clôturé", () => {
    const ancien = rdv({
      id: 801,
      npi: "0102030405",
      dateHeure: "2026-11-26T10:00",
      statut: "honore",
    });

    const resultat = controlerPriseRendezVous(
      {
        npi: "0102030405",
        service: "PERMIS",
        dateHeure: "2026-11-27T09:00",
      },
      { maintenant: benin("2026-11-20T18:00"), rendezVous: [ancien] },
    );
    expect(resultat.ok).toBe(true);
  });
});

describe("Règles complémentaires", () => {
  it("refuse un service inconnu avec le message prévu", () => {
    const resultat = controlerPriseRendezVous(
      { npi: "0614253647", service: "CIN", dateHeure: "2026-11-24T09:00" },
      { maintenant: MAINTENANT, rendezVous: [] },
    );
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(400);
    expect(resultat.message).toBe(
      "Service inconnu : choisissez PASSEPORT, CNI ou PERMIS.",
    );
  });

  it("refuse une date illisible avec le message prévu", () => {
    for (const dateHeure of [
      "2026-11-24 09:00",
      "24/11/2026T09:00",
      "2026-02-31T09:00",
      "2026-11-24T25:00",
      "2026-11-24T09:60",
      42,
      null,
    ]) {
      const resultat = controlerPriseRendezVous(
        { npi: "0614253647", service: "CNI", dateHeure },
        { maintenant: MAINTENANT, rendezVous: [] },
      );
      expect(resultat.ok).toBe(false);
      if (resultat.ok) continue;
      expect(resultat.status).toBe(400);
      expect(resultat.message).toBe(
        "Date et heure invalides (format attendu : AAAA-MM-JJTHH:MM).",
      );
    }
  });

  it("refuse une date passée", () => {
    const resultat = controlerPriseRendezVous(
      { npi: "0614253647", service: "CNI", dateHeure: "2026-11-19T09:00" },
      { maintenant: benin("2026-11-20T18:00"), rendezVous: [] },
    );
    expect(resultat.ok).toBe(false);
    if (resultat.ok) return;
    expect(resultat.status).toBe(409);
    expect(resultat.message).toBe("Impossible de prendre un rendez-vous dans le passé.");
  });

  it("refuse une heure hors grille (07:30, 09:15, 15:45)", () => {
    for (const dateHeure of [
      "2026-11-24T07:30",
      "2026-11-24T09:15",
      "2026-11-24T15:45",
    ]) {
      const resultat = controlerPriseRendezVous(
        { npi: "0614253647", service: "CNI", dateHeure },
        { maintenant: MAINTENANT, rendezVous: [] },
      );
      expect(resultat.ok).toBe(false);
      if (resultat.ok) continue;
      expect(resultat.status).toBe(409);
      expect(resultat.message).toBe(
        "Créneau invalide : de 08:00 à 15:30, toutes les 30 minutes.",
      );
    }
  });

  it("accepte 08:00 et 15:30, et refuse 16:00", () => {
    for (const dateHeure of ["2026-11-24T08:00", "2026-11-24T15:30"]) {
      const resultat = controlerPriseRendezVous(
        { npi: "0614253647", service: "CNI", dateHeure },
        { maintenant: MAINTENANT, rendezVous: [] },
      );
      expect(resultat.ok).toBe(true);
    }

    const horsGrille = controlerPriseRendezVous(
      { npi: "0614253647", service: "CNI", dateHeure: "2026-11-24T16:00" },
      { maintenant: MAINTENANT, rendezVous: [] },
    );
    expect(horsGrille.ok).toBe(false);
  });

  it("refuse d'annuler un rendez-vous honoré ou absent", () => {
    for (const statut of ["honore", "absent"] as const) {
      const resultat = controlerAnnulation(
        rdv({ id: 10, dateHeure: "2026-12-01T09:00", statut }),
        MAINTENANT,
      );
      expect(resultat.ok).toBe(false);
      if (resultat.ok) continue;
      expect(resultat.message).toBe("Ce rendez-vous ne peut plus être annulé.");
    }
  });

  it("normalise les bornes de pagination invalides", () => {
    const page = trierEtPaginer([], { page: 0, parPage: -3, maintenant: MAINTENANT });
    expect(page.page).toBe(1);
    expect(page.parPage).toBe(10);
    expect(page.total).toBe(0);
    expect(page.totalPages).toBe(1);
  });
});
