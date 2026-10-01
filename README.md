# KeyMine

Jeu de courses de frappe en multijoueur: tout le monde tape le même texte en
direct, le classement se fait au meilleur temps/précision, et chaque compte
garde un historique de ses stats et de ses touches faibles.

Ce document sert à la fois de guide de démarrage et de **feuille d'état
d'implémentation** par rapport au cahier des charges — à utiliser comme base
pour ta propre passe de correction.

## Sommaire

- [Stack technique](#stack-technique)
- [Démarrer en local](#démarrer-en-local)
- [Variables d'environnement](#variables-denvironnement)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [État d'implémentation](#état-dimplémentation)
- [Limites connues / choix assumés](#limites-connues--choix-assumés)

## Stack technique

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**, UI
  en **Tailwind CSS v4** ("pixel art" fait main, pas de lib de composants).
- **Base de données: PostgreSQL** (contrainte imposée), via
  [`kysely`](https://kysely.dev) (query builder typé) + [`pg`](https://node-postgres.com)
  (driver), avec des **migrations SQL écrites à la main** suivies par une
  table `_migrations` maison (`db/migrate.ts`). TECH-3 laisse l'outillage au
  choix de l'équipe: Prisma a été essayé en premier, mais son CLI télécharge
  un binaire (`schema-engine`) depuis `binaries.prisma.sh`, qui est bloqué
  par la politique réseau de l'environnement de dev utilisé ici — d'où le
  passage à une stack 100% compatible avec un accès réseau restreint.
- **Dev local sans serveur Postgres à installer**: le paquet
  `embedded-postgres` télécharge et lance un vrai binaire PostgreSQL 18 dans
  un dossier du projet (`.data/`, ignoré par git) — voir `scripts/dev-db.mjs`.
  En production, c'est un Postgres normal (managé ou auto-hébergé) via
  `DATABASE_URL`.
- **Temps réel: serveur WebSocket séparé** (`realtime/server.ts`, paquet
  `ws`), conformément à l'hypothèse H17 du cahier des charges ("Front
  Next.js + petit serveur TypeScript séparé pour le temps réel"). Ce serveur
  calcule lui-même le MPM/classement final (le client n'est jamais cru sur
  parole — JEU-8/JEU-9), simule les bots côté serveur, et checkpoint la
  progression en base toutes les 2s pour survivre à une reconnexion
  (COUR-15).
- **Auth maison** (pas de lib tierce type NextAuth): mots de passe hashés
  avec `bcryptjs`, sessions signées en JWT (`jose`) dans un cookie
  `httpOnly`, plus un cookie d'invité séparé (non signé, juste un
  identifiant) pour jouer sans compte.

## Démarrer en local

Prérequis: [Bun](https://bun.sh) 1.4+. Rien d'autre à installer — Postgres
est embarqué pour le dev.

```bash
bun install

# Terminal 1: lance un vrai Postgres local (garde-le ouvert)
bun run db:dev

# Terminal 2: applique les migrations, puis lance le site + le serveur temps réel
bun run db:migrate
bun run dev:all
```

`bun run dev:all` démarre `next dev` et `realtime/server.ts` en parallèle. Le
site est sur http://localhost:3000, le WebSocket temps réel sur le port 4001
(configurable, voir plus bas).

Copie `.env.example` vers `.env` avant de démarrer si tu veux changer les
valeurs par défaut — elles fonctionnent telles quelles pour le dev local.

### Scripts utiles

| Commande | Rôle |
| --- | --- |
| `bun run db:dev` | Démarre/garde ouvert un Postgres embarqué pour le dev |
| `bun run db:migrate` | Applique les migrations SQL non encore appliquées |
| `bun run dev:all` | `next dev` + serveur temps réel en parallèle |
| `bun run dev` | Next.js seul (sans le temps réel) |
| `bun run realtime` | Serveur WebSocket seul |
| `bun run build` | Build de production Next.js |
| `bun run lint` / `typecheck` / `test` | Qualité de code et tests unitaires |
| `bun run test:e2e` | Tests Playwright (bout en bout) |

`scripts/build-with-db.mjs` et `scripts/smoke-test-db.mjs` sont des scripts
utilitaires qui démarrent un Postgres embarqué jetable, appliquent les
migrations, lancent une commande donnée, puis arrêtent Postgres — utiles en
CI ou pour vérifier rapidement que tout compile contre une vraie base.

## Variables d'environnement

Voir `.env.example` pour la liste complète avec commentaires. Résumé:

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion Postgres (`postgresql://user:pass@host:port/db`) |
| `SESSION_SECRET` | Secret de signature des cookies de session (JWT). À régénérer en prod (`openssl rand -base64 32`) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | Connexion Discord (AUTH-5, optionnel — le bouton se désactive proprement si absent) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Connexion GitHub (AUTH-5, optionnel, idem) |
| `NEXT_PUBLIC_SITE_URL` | URL publique du site (callbacks OAuth, liens absolus) |
| `REALTIME_PORT` | Port d'écoute du serveur WebSocket (défaut `4001`) |
| `NEXT_PUBLIC_REALTIME_URL` | URL WebSocket que le navigateur utilise pour se connecter |

Pour activer Discord/GitHub: crée une application côté fournisseur et
enregistre exactement `{NEXT_PUBLIC_SITE_URL}/api/auth/discord/callback` (ou
`.../github/callback`) comme URL de redirection. Seuls l'identifiant, le nom
d'utilisateur et l'avatar du fournisseur sont lus — jamais le courriel (voir
[Limites connues](#limites-connues--choix-assumés)).

## Tests

- **Unitaires** (`bun run test`, Vitest): logique pure — génération de texte
  (`lib/text/generate.ts`), calcul de heatmap clavier (`lib/heatmap.ts`),
  rendu de composants UI.
- **Bout en bout** (`bun run test:e2e`, Playwright): parcours réels dans un
  navigateur (accueil, création de salle). Playwright démarre lui-même un
  build de prod et l'arrête à la fin — besoin d'un `DATABASE_URL` valide
  pointant vers une base migrée.
- **CI** (`.github/workflows/ci.yml`): sur chaque push/PR vers `main`, lance
  lint + typecheck + tests unitaires, puis (contre un vrai conteneur
  Postgres fourni par GitHub Actions) les migrations, le build de prod et
  les tests e2e.

## Déploiement

Pas fait ici: ce dépôt ne provisionne pas d'infrastructure. Le cahier des
charges (TECH-5) laisse ça à l'équipe — concrètement il faut:

1. Un serveur (VPS ou équivalent) + un nom de domaine + un certificat HTTPS
   (Let's Encrypt via un reverse proxy comme Caddy ou nginx, par exemple).
2. Une vraie instance PostgreSQL accessible depuis ce serveur (managée ou
   auto-hébergée — `embedded-postgres` est un outil de **dev uniquement**,
   pas fait pour la prod).
3. Appliquer les migrations (`bun run db:migrate`) contre cette base avant
   le premier démarrage.
4. Démarrer **deux processus**: `bun run build && bun run start` (le site
   Next.js) et `bun run realtime` (le serveur WebSocket), avec les variables
   d'environnement de la section précédente.
5. Le reverse proxy doit faire passer les en-têtes de mise à niveau
   WebSocket (`Upgrade`/`Connection`) vers le port de `REALTIME_PORT`, et
   `NEXT_PUBLIC_REALTIME_URL` doit pointer vers l'URL publique en `wss://`
   une fois le HTTPS en place.

## État d'implémentation

Table de correspondance entre les identifiants du cahier des charges et ce
qui a été construit, pour servir de point de départ à ta propre passe de
correction. Les IDs cités sont ceux qu'on retrouve littéralement en
commentaire dans le code (`grep -rn "AUTH-\|COUR-\|TXT-\|JEU-\|BOT-\|STAT-\|UI-" .`
depuis la racine du projet) — si un identifiant de ton cahier des charges
n'apparaît pas ici, c'est probablement qu'il manque une vérification de ma
part plutôt qu'une absence totale de la fonctionnalité correspondante;
croise avec ta feuille de notes.

### Authentification (AUTH)

| ID | Statut | Détail |
| --- | --- | --- |
| AUTH-1/AUTH-2 | ✅ Fait | Inscription nom d'utilisateur + mot de passe, aucun courriel demandé ni stocké (`app/api/auth/register`) |
| AUTH-5 | ✅ Fait | Connexion Discord et GitHub (OAuth2 "code flow" fait main, voir `lib/auth/oauth.ts`, `app/api/auth/{discord,github}/{start,callback}`). Scope minimal (`identify` / `read:user`), courriel jamais demandé. Compte créé automatiquement au premier login, avatar synchronisé à chaque connexion |
| AUTH-7 | ✅ Fait | Jeu en invité via simple cookie, sans compte (`lib/auth/guest.ts`) |
| AUTH-8 | ✅ Fait | Fusion de l'historique invité vers le compte à l'inscription/connexion, y compris via OAuth (`lib/stats.ts: mergeGuestHistory`) |
| AUTH-9 | ✅ Fait | Verrouillage après 5 tentatives échouées, 15 minutes (`app/api/auth/login`) |
| AUTH-3, AUTH-4, AUTH-6, AUTH-10 | ⚠️ À vérifier | Pas de trace explicite dans les commentaires de code — si ces identifiants existent dans ton cahier des charges, vérifie-les un par un (AUTH-10 est listé "Moins prioritaire" dans les notes de cette implémentation, donc probablement volontairement différé) |

### Salles / courses (COUR)

| ID | Statut | Détail |
| --- | --- | --- |
| COUR-1 | ✅ Fait | L'hôte crée la salle et règle toutes les options (`app/jouer/creer`, `app/api/lobbies`) |
| COUR-2 | ✅ Fait | Rejoindre via un code court et facile à retaper (`lib/lobby.ts`) |
| COUR-6 | ✅ Fait | Minimum 2 participants (bots inclus) pour démarrer |
| COUR-7 | ✅ Fait | Un lobby plein refuse les nouveaux joueurs |
| COUR-8 | ✅ Fait | Rejoindre comme participant ou spectateur |
| COUR-12 | ✅ Fait | Classement des non-finalistes quand le temps est écoulé |
| COUR-13 | ✅ Fait | Transfert d'hôte si inactif (60s) vers le joueur présent depuis le plus longtemps; l'hôte peut aussi fermer la salle manuellement |
| COUR-14 | ✅ Fait | Bouton Abandonner — classé dernier |
| COUR-15 | ✅ Fait | Checkpoint périodique en base + reconnexion (le participant n'est pas retiré si le socket tombe) |
| COUR-16 | ✅ Fait | "Partie rapide": rejoint un lobby public ouvert ou en crée un (`app/api/play/quick`) |
| COUR-3, COUR-4, COUR-5, COUR-9, COUR-10, COUR-11, COUR-17 | ⚠️ À vérifier | Pas de trace explicite — COUR-17 est listé "Moins prioritaire" dans les notes de cette implémentation |

### Génération de texte (TXT)

| ID | Statut | Détail |
| --- | --- | --- |
| TXT-1 à TXT-8 | ✅ Fait | 4 modes (texte / désordre / accents / ciblé), décorations optionnelles (majuscules, ponctuation, chiffres, symboles), coupe nette à la longueur choisie, garantie d'au moins un mot accentué en mode "accents" (`lib/text/generate.ts`, `lib/text/bank.ts`) |
| TXT-8 | ✅ Fait | Même texte généré pour tous les participants d'une course |

### Jeu / course en temps réel (JEU)

| ID | Statut | Détail |
| --- | --- | --- |
| JEU-1 | ✅ Fait | Décompte de 5s avant le départ |
| JEU-5/JEU-6 | ✅ Fait | Deux modes d'erreur: "accumuler" (continue, marque reste rouge) et "bloquer" (bloqué jusqu'à la bonne touche) |
| JEU-8/JEU-9 | ✅ Fait | MPM et classement calculés **côté serveur uniquement** (anti-triche — rejette un MPM client irréaliste), copier-coller désactivé |
| H6 | ✅ Fait | Pas de retour arrière (Backspace bloqué pendant la course) |
| JEU-2, JEU-3, JEU-4, JEU-7, JEU-10 | ⚠️ À vérifier | Pas de trace explicite — JEU-10 est listé "Moins prioritaire" |

### Bots (BOT)

| ID | Statut | Détail |
| --- | --- | --- |
| BOT-1 | ✅ Fait | L'hôte ajoute des bots à sa course (`app/api/lobbies/[code]/bots`) |
| BOT-2/BOT-3 | ✅ Fait | 4 niveaux (débutant/intermédiaire/expert/impossible), vitesse cible + taux d'erreur par niveau, variation pour paraître humain (`realtime/bots.ts`) |

### Statistiques (STAT)

| ID | Statut | Détail |
| --- | --- | --- |
| STAT-3/STAT-5 | ✅ Fait | Stats par touche (correct/erreur), heatmap clavier (`lib/heatmap.ts`) |
| STAT-4 | ✅ Fait | Stats agrégées du compte (meilleur MPM, total courses, précision moyenne, série de jours consécutifs) recalculées après chaque course (`lib/stats.ts`) |
| STAT-8 | ✅ Fait | Historique d'un invité limité à l'onglet/session (`sessionStorage`, effacé à la fermeture) |
| Profil & résultats | ✅ Fait | `app/profil` (page compte avec heatmap globale, progression MPM sur 20 dernières courses, historique) et `app/resultats/[code]` (podium réel, classement complet, comparaison à la moyenne) sont branchés sur de vraies données — numéros d'ID exacts à confirmer dans ton cahier des charges |

### Interface (UI)

| ID | Statut | Détail |
| --- | --- | --- |
| UI-4 | ⚠️ Partiel | Site bilingue FR/EN fonctionnel (sélecteur persistant, `localStorage`) mais la traduction ne couvre que la navigation/l'interface commune et la page d'accueil — pas le contenu de chaque page, pour prioriser le reste du travail essentiel |
| UI-6 | ✅ Fait | Couleur de la heatmap par pourcentage, pas une couleur fixe |
| UI-3 (thème clair/sombre) | ⚠️ Partiel | Le bouton fonctionne (persiste, bascule un attribut sur `<html>`) mais le thème clair reste modeste: beaucoup de classes Tailwind du projet utilisent des couleurs fixes en dur, utilisées à la fois dans des zones qui doivent changer de couleur et des zones qui doivent rester sombres (header, touches du clavier) — un retheme complet demanderait un refactor plus large que ce que justifie le tier "souhaitable" de cette exigence |
| UI-1, UI-2, UI-5 | ⚠️ À vérifier | Pas de trace explicite dans les commentaires |

### Technique (TECH)

| ID | Statut | Détail |
| --- | --- | --- |
| TECH-3 | ✅ Fait | Outillage DB laissé au choix de l'équipe: migrations SQL + Kysely au lieu de Prisma (voir [Stack technique](#stack-technique)) |
| TECH-5 | ⚠️ Pas applicable ici | Hébergement (serveur/domaine/HTTPS) — voir [Déploiement](#déploiement), ne peut pas être fait depuis ce dépôt |
| TECH-6 | ✅ Fait | CI GitHub Actions: lint, typecheck, tests unitaires, build contre un vrai Postgres, tests e2e (`.github/workflows/ci.yml`) |
| TECH-7 | ✅ Fait | Cette documentation |
| TECH-1, TECH-2, TECH-4 | ⚠️ À vérifier | Pas de trace explicite |

### Bonus (BON) — tier "Moins prioritaire"

| ID | Statut |
| --- | --- |
| BON-1 à BON-5 | ❌ Non fait — délibérément différé (tier "Moins prioritaire" du cahier des charges, pour prioriser le tronc essentiel). La case à cocher "Activer les bonus" existe déjà, désactivée, dans l'écran de création de course, prête à être branchée |

## Limites connues / choix assumés

- **Base de données**: PostgreSQL, comme demandé — en dev via un binaire
  embarqué (`embedded-postgres`), en prod via un Postgres standard. Pas de
  Prisma (voir plus haut pourquoi).
- **OAuth et courriel**: Discord/GitHub ne servent qu'à se connecter et
  récupérer un avatar — le courriel n'est jamais demandé ni lu, seulement un
  identifiant stable et un nom d'utilisateur, conformément à la décision du
  cahier des charges de ne jamais stocker de courriel.
- **UI-4 (bilingue)**: infrastructure complète et fonctionnelle, mais
  couverture de traduction volontairement limitée à la coquille commune du
  site (nav, accueil) pour protéger le temps alloué aux items essentiels.
- **UI-3 (thème clair)**: fonctionnel mais visuellement modeste, pour la
  raison expliquée dans la table ci-dessus.
- **Items "Moins prioritaire"**: BON-1 à BON-5 (bonus de jeu), et tout
  identifiant explicitement marqué comme tel dans ton cahier des charges,
  n'ont pas été implémentés dans cette passe — à traiter dans une itération
  suivante si tu le souhaites.
- **Tests e2e**: ne couvrent que deux parcours (accueil, création de salle)
  — à étoffer (rejoindre une salle, course complète avec bots, OAuth) si tu
  veux une couverture plus large en CI.
