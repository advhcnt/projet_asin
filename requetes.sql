-- Requêtes d'impact sur l'export « Rendez-vous au guichet ».
--
-- L'export a été réalisé le vendredi 20/11/2026 à 18:00 (heure du Bénin).
-- Les requêtes se placent à cet instant pour rester reproductibles sur les
-- données fournies. En production, remplacer l'instant de référence par
-- CURRENT_TIMESTAMP (les colonnes sont des timestamp sans fuseau, à l'heure
-- du Bénin).

-- 1. Rendez-vous confirmés à venir pris un samedi ou un dimanche,
--    pour prévenir les usagers (TMA-101).
WITH instant AS (SELECT TIMESTAMP '2026-11-20 18:00:00' AS maintenant)
SELECT
  r.id,
  r.npi,
  r.service,
  r.date_heure,
  r.statut
FROM rendez_vous r
CROSS JOIN instant i
WHERE r.statut = 'confirme'
  AND r.date_heure > i.maintenant
  AND EXTRACT(ISODOW FROM r.date_heure) IN (6, 7) -- 6 = samedi, 7 = dimanche
ORDER BY r.date_heure, r.id;

-- 2. Créneaux qui comptent plus de 3 rendez-vous non annulés (TMA-102).
SELECT
  date_heure,
  COUNT(*) AS occupants,
  ARRAY_AGG(id ORDER BY id) AS rendez_vous
FROM rendez_vous
WHERE statut <> 'annule'
GROUP BY date_heure
HAVING COUNT(*) > 3
ORDER BY date_heure;

-- 3. Rendez-vous passés du statut « annulé » à un autre statut (TMA-105).
SELECT
  r.id,
  r.npi,
  r.service,
  r.date_heure,
  r.statut AS statut_actuel,
  h.ancien_statut,
  h.nouveau_statut,
  h.modifie_le,
  h.modifie_par
FROM historique_statuts h
JOIN rendez_vous r ON r.id = h.rendez_vous_id
WHERE h.ancien_statut = 'annule'
  AND h.nouveau_statut <> 'annule'
ORDER BY h.modifie_le, h.id;
