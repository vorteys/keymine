# Utilisation de l'IA

## Agents et outils utilisés

- **Claude (Anthropic)** via l'application de bureau Claude (mode Cowork / Claude Code) : écriture et refactorisation du code, des tests et de la documentation technique, sous la direction de l'équipe.
- Aucun outil d'IA n'a servi pour le **nom, le logo, le moodboard, la palette et les typographies** : cette partie est faite à la main par l'équipe (DES-01 à DES-03, voir `DEMARCHE-CREATIVE.md`).

## Fichiers d'instructions d'agent (commités)

- [`AGENTS.md`](../AGENTS.md) : règles du projet pour les agents (règles non négociables du cahier des charges, architecture, commandes, pièges d'environnement, règles de commit et de tests).
- [`CLAUDE.md`](../CLAUDE.md) : renvoie vers `AGENTS.md`.

## Trois situations où l'IA s'est trompée

### 1. Une matrice d'exigences avec de faux identifiants

**Ce qui s'est passé.** Le premier README contenait un tableau d'exigences dont les identifiants (`COUR-1`, `JEU-8`…) venaient d'une ancienne version du travail, pas du PDF du cahier des charges. L'agent les présentait comme « le cahier des charges ».
**Détection.** En relisant le PDF officiel (`docs/cahier-des-charges.pdf`) : les identifiants (`SALLE-06`, `COURSE-06`, `CONF-03`…) ne correspondaient pas.
**Correction.** Le tableau a été supprimé et remplacé par `docs/EXIGENCES.md`, 90 lignes bâties sur les vrais identifiants, avec des statuts volontairement prudents. Règle ajoutée à `AGENTS.md` : le PDF fait foi.

### 2. Un script de base de données qui réinitialisait Postgres à chaque démarrage

**Ce qui s'est passé.** Le script `db:dev` (Postgres embarqué pour le développement) appelait `initialise()` à chaque lancement : au second démarrage, il tentait de recréer une base existante.
**Détection.** Lancement du script deux fois de suite pendant la mise en place de la CI et du seed.
**Correction.** Le script vérifie la présence de `PG_VERSION` avant d'initialiser ; le même garde-fou a été repris dans `scripts/build-with-db.ts`.

### 3. Une règle d'entrée en salle qui plantait dans un cas réel

**Ce qui s'est passé.** `joinLobby` ne regardait que les salles *actives* : une personne libérée automatiquement (absente) puis revenue dans la même salle provoquait une violation de l'index unique `lobby_players_user_unique` et une erreur 500. En parallèle, le transfert d'hôte pouvait désigner un invité, alors qu'un invité ne doit jamais gérer une salle.
**Détection.** En écrivant les tests d'intégration contre une vraie base (`tests/db/join.test.ts`, `tests/db/sweep.test.ts`) : le cas « libéré puis de retour » n'avait jamais été exercé à la main.
**Correction.** Réactivation de la ligne existante au lieu d'une insertion, rôle conservé, capacité vérifiée, et transfert limité aux comptes ; les tests restent dans la CI.

Autres erreurs corrigées en cours de route (plus petites) : curseur de capacité allant jusqu'à 100 alors que la validation serveur plafonne à 30 (le formulaire aurait été refusé), copie de travail effacée par une option `rsync` trop large, types `ws` manquants qui cassaient `tsc`.

## Réflexion sur notre façon de travailler avec les agents

_À rédiger par l'équipe, avec ses propres mots : ce qui a bien marché, ce qui a demandé de la vigilance, ce que nous referions autrement._

## Limites connues liées à l'IA

- Les passages du corpus de textes (`db/seed-data/corpus.ts`) ont été transcrits de mémoire par l'agent : ils sont du domaine public, mais chaque passage doit être **re-vérifié** contre Wikisource ou Project Gutenberg avant la remise finale.
