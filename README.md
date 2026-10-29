# Rendez-vous au guichet — étude de cas TMA

Reconstruction du service de prise de rendez-vous (passeport, carte d'identité,
permis de conduire) à partir des règles de gestion et de l'export
`base_rendez_vous.sql`. Le code d'origine n'étant pas fourni, le cœur du rendu
est un **module de règles métier pur**, testé, doublé d'une API Next.js et
d'une interface pour rejouer les parcours.

## Stack

- **Next.js 16** (App Router, route handlers), React 19, TypeScript, Tailwind 4.
- **PostgreSQL** avec **Prisma 7** et l'adaptateur `@prisma/adapter-pg`.
- **Vitest 3** pour les tests.

## Démarrage

Prérequis : Node.js ≥ 20.19 (testé avec Node 22) et PostgreSQL.

```bash
npm install                 # installe les dépendances et génère le client Prisma
cp .env.example .env        # puis renseigner DATABASE_URL
npm run db:identites        # une seule fois : ajoute les identités absentes de l'export
npm run dev
```

`db:identites` est nécessaire car l'export crée les clés primaires en
`INTEGER PRIMARY KEY` sans séquence : sans lui, PostgreSQL n'attribue pas
d'`id` aux nouveaux rendez-vous. Le script est idempotent (il ne fait rien si
les colonnes sont déjà des identités) et recale les séquences sur les données
importées.

Commandes utiles :

| Commande | Rôle |
| --- | --- |
| `npm test` | exécute les tests Vitest (31 tests) |
| `npm run test:watch` | tests en surveillance |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run build` | build de production Next |
| `npm run prisma:generate` | régénère le client Prisma |
| `npm run db:identites` | ajoute les identités manquantes |

Les tests sont **indépendants de la base et du réseau** : ils appellent
directement `lib/rendez-vous/` avec une heure courante injectée.

```
tests/regles.test.ts  31 tests — TMA-101 à TMA-107 + cas limites
```

## Architecture

```
lib/rendez-vous/
  types.ts        types, codes services/statuts, convention de temps
  dates.ts        parsing/formatage « heure du Bénin », grille horaire
  messages.ts     messages de refus exacts du sujet
  regles.ts       MODULE PUR : prise de RDV, annulation, statut, tri/pagination
  depot.ts        persistance Prisma (aucune règle métier ici)
  presentation.ts sérialisation JSON
app/api/          route handlers
app/              écrans usager et agent
prisma/           schéma des tables existantes + script d'identités
requetes.sql      requêtes d'impact
```

Le module ne dépend ni de Prisma, ni de Next, ni de `Date.now()` : toutes les
fonctions reçoivent `maintenant`. Les règles dépendantes de l'existant
(unicité du rendez-vous à venir, capacité) prennent la liste des rendez-vous en
paramètre. C'est ce qui rend le jury capable de le tester directement.

### Convention de temps

Toutes les heures sont celles du Bénin (GMT+1, sans heure d'été). Pour éviter
toute dépendance au fuseau de la machine, le module manipule des `Date` dont
les accesseurs **UTC** portent l'heure murale du Bénin :
`2026-11-10 09:00` au Bénin = `new Date("2026-11-10T09:00:00.000Z")`.
`maintenantBenin()` convertit un instant réel dans cette convention.
Prisma renvoie les `timestamp without time zone` de la base avec les mêmes
composantes UTC, ce qui rend la conversion inutile en lecture.

Pour construire une date dans un test ou un appel au module, utiliser
`heureBenin()` plutôt que `new Date("2026-11-10T09:00")`, qui serait interprété
dans le fuseau de la machine :

```ts
import { controlerPriseRendezVous, heureBenin } from "@/lib/rendez-vous";

const resultat = controlerPriseRendezVous(
  { npi: "0614253647", service: "CNI", dateHeure: "2026-11-24T09:00" },
  { maintenant: heureBenin("2026-11-20T18:00"), rendezVous: [] },
);
```

En production, l'heure courante se construit avec
`maintenantBenin(new Date())`.

### API

| Méthode | Route | Rôle |
| --- | --- | --- |
| `POST` | `/api/rendez-vous` | prise de rendez-vous |
| `GET` | `/api/rendez-vous?date=AAAA-MM-JJ[&statut=]` | journée du guichet |
| `POST` | `/api/rendez-vous/:id/annulation` | annulation usager |
| `PATCH` | `/api/rendez-vous/:id/statut` | clôture agent (`{ "statut": "honore" \| "absent" }`) |
| `GET` | `/api/usagers/:npi/rendez-vous?page=n` | liste paginée |
| `GET` | `/api/creneaux?date=AAAA-MM-JJ` | occupation des créneaux |

Les erreurs métier renvoient `{"erreur": "…"}` avec le code HTTP prévu par le
sujet. Un identifiant inconnu renvoie `404`.

## Qualification et traitement des tickets

| Ticket | Qualification | Règle de la section 2 |
| --- | --- | --- |
| TMA-101 | **Anomalie** | « Le centre reçoit du lundi au vendredi » |
| TMA-102 | **Anomalie** | « Un créneau accueille au plus 3 usagers » |
| TMA-103 | **Anomalie** | « Un NPI, composé d'exactement 10 chiffres » |
| TMA-104 | **Anomalie** | « L'usager peut annuler jusqu'à 24 heures avant » |
| TMA-105 | **Anomalie** | « Ces trois statuts sont définitifs » |
| TMA-106 | **Anomalie** | « prochain rendez-vous en tête, par pages de 10 » |
| TMA-107 | **Conforme** | « un seul rendez-vous à venir, tous services confondus » |

### TMA-101 — rendez-vous un samedi

- **Trace** : `POST` pour le `2026-11-14T10:00` accepté avec `201`, alors que le
  14/11/2026 est un **samedi**. Le rendez-vous n° 742 existe dans l'export en
  statut `confirme`.
- **Cause probable** : le contrôle de date vérifie le format et le caractère
  passé, mais jamais le jour de la semaine. Aucun test `getUTCDay()` /
  `EXTRACT(ISODOW)` n'est fait avant l'insertion.
- **Correction** : `validerEntree()` refuse samedi et dimanche (`409`,
  « Le centre est fermé le week-end. ») après le contrôle « date passée ».
- **Test** : `TMA-101 — rendez-vous un samedi` rejoue exactement le cas, plus
  le dimanche.
- **Constat sur les données** : 8 rendez-vous tombent un samedi (tous
  confirmés), pas seulement le n° 742 (voir bonus).

### TMA-102 — quatre usagers sur un créneau de trois places

- **Trace** : les n° 632, 644 et 681 occupent le 10/11/2026 à 09:00 ; le
  n° 697 est créé ensuite et accepté (`201`), soit quatre rendez-vous.
- **Cause probable** : erreur de borne dans le contrôle de capacité
  (`count > 3` au lieu de `count >= 3`), ou comptage des rendez-vous annulés,
  ou encore vérification puis insertion non atomiques (deux requêtes
  concurrentes lisent 2 puis insèrent toutes les deux).
- **Correction** : `controlerDisponibilites()` compte les rendez-vous
  **non annulés** du créneau et refuse dès le 4e (`409`, « Ce créneau est
  complet. »). La création s'exécute dans une transaction **Serializable**
  avec trois tentatives en cas de conflit (`P2034`).
- **Tests** : 4e refusé, 3e accepté, place libérée par une annulation, et un
  test HTTP concurrent (5 demandes simultanées → 3 succès, 2 refus) exécuté
  manuellement sur l'API.
- **Constat** : 3 créneaux sont en surcapacité dans l'export (10/11 09:00,
  22/10 10:30, 24/11 14:00).

### TMA-103 — une lettre dans le NPI

- **Trace** : `06142A3647` provoque `500 {"erreur":"Erreur interne du serveur"}`.
- **Cause probable** : validation par longueur uniquement, puis conversion en
  nombre (`parseInt`/`Number`) qui produit `NaN`, ou transmission directe à une
  colonne numérique, l'exception n'étant pas interceptée.
- **Correction** : expression régulière `^\d{10}$` avant tout accès à la base,
  réponse `400` avec le message exact
  « Le NPI doit comporter exactement 10 chiffres. ».
- **Test** : le NPI de la trace, plus les cas trop court, trop long et vide.

### TMA-104 — annulation refusée à 40 heures

- **Trace** : le 17/11/2026 à 18:00, annulation du rendez-vous du 19/11 à
  10:00 refusée avec « moins de 24 h avant ». L'écart réel est de **40 heures**.
- **Cause probable** : seuil erroné (48 h), signe inversé dans la soustraction,
  ou comparaison de jours calendaires sans tenir compte de l'heure.
- **Correction** : `controlerAnnulation()` autorise si
  `dateHeure - maintenant >= 24 h` (l'égalité est acceptée) et refuse en
  dessous avec le message attendu.
- **Tests** : 17/11 18:00 accepté, 24 h pile accepté, 23 h 59 refusé, plus
  l'indicateur `annulable` utilisé par l'interface.

### TMA-105 — un rendez-vous annulé repassé en honoré

- **Trace** : `PATCH /292/statut {"statut":"honore"}` sur un rendez-vous
  `annule` renvoie `200` et le statut devient `honore`. La base contient la
  transition `annule → honore` (historique n° 676).
- **Cause probable** : le code valide uniquement le statut **demandé**
  (`honore`/`absent`) sans vérifier le statut **courant**, ou applique
  `update` sans garde.
- **Correction** : `controlerChangementStatut()` vérifie d'abord la cible
  (`400` si inconnue), puis exige `statut === "confirme"` (`409`,
  « Ce rendez-vous est déjà clôturé. »). L'écriture et l'historique se font
  dans la même transaction.
- **Tests** : `annule → honore`, `honore/absent → autre`, cible invalide, et
  succès sur un rendez-vous confirmé.
- **Constat** : 4 transitions depuis `annule` existent (n° 208, 231, 262, 292),
  dont 3 passées en `honore`.

### TMA-106 — le prochain rendez-vous absent de la première page

- **Trace** : sur 13 rendez-vous, la page 1 renvoie 9 dates dans un ordre
  incohérent (28/07, 25/09, 21/04, 19/05, 16/06, 12/02, 11/08, 08/05, 07/07) ;
  celui du 02/12 n'apparaît pas.
- **Cause probable** : tri par `id` ou `cree_le` au lieu de `date_heure`, tri
  après le `LIMIT/OFFSET`, et/ou taille de page erronée (9 au lieu de 10).
- **Correction** : `trierEtPaginer()` trie la liste complète — prochain
  rendez-vous **confirmé à venir** en tête, puis les autres par date
  décroissante — puis découpe 10 par page. L'API expose `total` et
  `totalPages`.
- **Tests** : page 1 = 10 éléments avec le n° 826 (02/12) en tête, ordre exact
  des 9 suivants, page 2 = 3 éléments, aucun doublon ni oubli.

### TMA-107 — deuxième rendez-vous à venir (conforme)

- **Trace** : `0102030405` a déjà le rendez-vous n° 800 le 26/11 à 10:00 ; la
  demande d'un `PERMIS` le 27/11 à 09:00 est refusée avec
  « Vous avez déjà un rendez-vous à venir. ».
- **Qualification** : **conforme** à la règle « un seul rendez-vous à venir,
  tous services confondus ». Le service différent ne crée pas d'exception.
- **Traitement** : aucune correction ; le module conserve ce comportement et
  un rendez-vous clôturé (honoré, absent, annulé) ne bloque plus une nouvelle
  prise.
- **Test** : le cas de la trace, et la prise autorisée après clôture du
  précédent.

## Résultats des requêtes d'impact

Exécutées sur l'export, à l'instant de référence **20/11/2026 18:00** (heure
du Bénin). Les dates ci-dessous sont les heures du Bénin.

### 1. Confirmés à venir un samedi ou un dimanche

| id | NPI | Service | Date | Statut |
| --- | --- | --- | --- | --- |
| 680 | 0669147625 | PASSEPORT | samedi 21/11/2026 08:30 | confirme |
| 730 | 0679617916 | CNI | samedi 28/11/2026 09:00 | confirme |
| 834 | 0610588823 | CNI | samedi 05/12/2026 10:00 | confirme |
| 857 | 0671987446 | PERMIS | samedi 05/12/2026 10:00 | confirme |
| 874 | 0648953073 | PASSEPORT | samedi 12/12/2026 11:00 | confirme |

5 usagers sont à prévenir. Le n° 742 de la trace est déjà passé à la date de
l'export ; il reste néanmoins un rendez-vous de samedi confirmé.

### 2. Créneaux à plus de 3 rendez-vous non annulés

| Créneau | Occupants | Rendez-vous |
| --- | --- | --- |
| 22/10/2026 10:30 | 4 | 502, 511, 517, 519 |
| 10/11/2026 09:00 | 4 | 632, 644, 681, 697 |
| 24/11/2026 14:00 | 4 | 728, 750, 763, 783 |

Seul le créneau du 10/11 était signalé par le chef de centre.

### 3. Rendez-vous passés de « annulé » à un autre statut

| Rendez-vous | NPI | Date du RDV | Ancien → nouveau | Modifié le | Par |
| --- | --- | --- | --- | --- | --- |
| 208 | 0384914669 | 07/10/2026 10:00 | annule → honore | 07/10 10:20 | AG-01 |
| 231 | 0370202195 | 15/10/2026 10:00 | annule → honore | 15/10 10:26 | AG-02 |
| 262 | 0317656053 | 29/10/2026 10:00 | annule → absent | 29/10 10:21 | AG-03 |
| 292 | 0330677555 | 12/11/2026 10:00 | annule → honore | 12/11 10:13 | AG-04 |

## Bonus — anomalies non signalées

1. **Week-ends** : 8 rendez-vous tombent un samedi, tous `confirme` — n° 475
   (31/10), 742 et 715 (14/11), 680 (21/11), 730 (28/11), 834 et 857 (05/12),
   874 (12/12). Le n° 715, même journée que le 742 signalé, n'avait pas été
   repéré. La correction de TMA-101 couvre aussi ces cas.
2. **Surcapacité** : 2 créneaux supplémentaires à 4 occupants (22/10 10:30 et
   24/11 14:00) en plus du 10/11 signalé. La correction de TMA-102 les empêche.
3. **Statuts définitifs** : 3 autres transitions depuis `annule` (208, 231,
   262) en plus du 292 signalé. La correction de TMA-105 les refuse.
4. **NPI stockés non conformes** : n° 459 (`01234567890`, 11 chiffres) et
   n° 642 (`061425364711`, 12 chiffres). La validation de TMA-103 empêche les
   nouvelles saisies, mais les lignes existantes restent à nettoyer.
5. **Heures hors grille** : n° 490 (16:00), 698 (16:30) et 842 (16:00, encore
   `confirme`). Le contrôle `estDansLaGrille()` les refuse désormais.
6. **Confirmés jamais clôturés** : n° 475, 742 et 715 sont encore `confirme`
   alors que leur créneau est passé. Aucune règle du sujet n'impose une
   clôture automatique ; c'est un défaut d'exploitation à traiter (tâche
   planifiée ou alerte), signalé ici.
7. **Couverture incomplète de l'historique** : l'historique ne contient que
   les transitions depuis `confirme`, pas les créations. Ce n'est pas une
   anomalie de règle, mais cela limite l'audit ; le module trace bien chaque
   annulation et chaque clôture.

Les données de l'export n'ont pas été modifiées : les requêtes ci-dessus
servent à mesurer l'impact, le module empêche la reproduction des anomalies.

## Choix et limites

- Le module est la source de vérité des règles ; `depot.ts` ne fait que lire,
  écrire et tracer. Aucun message métier n'est construit dans les routes.
- La capacité et l'unicité du rendez-vous à venir sont vérifiées dans une
  transaction Serializable avec nouvelle tentative. Le test concurrent à
  5 demandes a produit exactement 3 créations.
- Le tri applique « prochain rendez-vous à venir en tête, puis du plus récent
  au plus ancien » ; les rendez-vous annulés restent visibles dans la liste.
- Il n'y a pas d'authentification : le code agent est saisi dans l'écran
  guichet (ou l'en-tête `x-agent`) et journalisé dans `historique_statuts`.
- L'export est chargé tel quel ; `prisma/00-identites.sql` ne modifie que les
  séquences d'`id`. Les séquences sont recalées après nettoyage des essais.
