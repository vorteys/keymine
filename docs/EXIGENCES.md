# Matrice de traçabilité des exigences

Version initiale — état après le commit `7280b6e`. Source : `docs/cahier-des-charges.pdf`.

Statuts : **complet** (fait et vérifié), **partiel** (existe mais incomplet ou non vérifié), **non fait**. Ce fichier est mis à jour dans le même commit que chaque changement.

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TECH-01 | complet | `app/`, `next.config.ts` | — | Next.js 16 App Router, React 19. |
| TECH-02 | partiel | `tsconfig.json`, `eslint.config.mjs` | `bun run lint`, `bun run typecheck` (CI) | `strict: true`, aucun `any` explicite, aucun `@ts-ignore`. Restent des fichiers `.mjs` (`scripts/*.mjs`, configs) à porter en TypeScript. |
| TECH-03 | complet | `app/globals.css`, composants | — | Tailwind v4. |
| TECH-04 | complet | db/migrations/, db/migrate.ts, db/seed.ts, db/types.ts | tests/db/seed.test.ts | PostgreSQL + Kysely (query builder, pas un ORM : choix à défendre dans l'ADR). Migrations SQL versionnées ; seed idempotent (corpus, dictionnaires, 5 comptes de démo + historique), lancé par bun run db:seed. |
| TECH-05 | non fait | — | — | Déploiement VPS + HTTPS à faire par l'étudiant ; fichiers de déploiement (Docker, Caddy) à préparer. |
| TECH-06 | partiel | realtime/server.ts, realtime/lobby-channel.ts, components/useLobbyLive.ts | tests/db/realtime.test.ts | WebSocket (ws) authentifié par cookie signé + contrôle d'origine ; salle d'attente en direct via LISTEN/NOTIFY avec repli HTTP. Course : protocole validé, mais la fréquence d'envoi côté client n'est pas encore réduite. |
| TECH-07 | partiel | realtime/protocol.ts, lib/lobby-schema.ts, app/api/** | tests/unit/realtime-protocol.test.ts | Messages WebSocket validés par Zod (course et salle). Couverture Zod des routes API restant à auditer route par route. |
| TECH-08 | complet | — | — | Aucun service payant ; Postgres embarqué en dev seulement. |
| TECH-09 | partiel | `.github/workflows/ci.yml` | — | Lint, `tsc`, tests unitaires, build, e2e. Première exécution sur GitHub à confirmer. |
| TECH-10 | complet | `.env.example` | — | Toutes les variables documentées ; `.env` ignoré par git. |
| DES-01 | non fait | `docs/DEMARCHE-CREATIVE.md` | — | À faire par l'étudiant, sans IA. |
| DES-02 | non fait | — | — | À faire par l'étudiant, sans IA. Favicon à intégrer ensuite. |
| DES-03 | non fait | `docs/DEMARCHE-CREATIVE.md` | — | Moodboard, palette, typographies : à faire par l'étudiant. |
| DES-04 | partiel | `components/ui.tsx`, `app/globals.css` | — | Style pixel maison (pas de shadcn). La piste de progression, élément signature, n'est pas faite. |
| DES-05 | partiel | `app/layout.tsx`, `components/PixelShell.tsx`, `app/globals.css` | — | Script bloquant dans head : choix enregistré sinon préférence système, sans flash. Palette claire à reprendre avec l identité visuelle (contrastes AA à vérifier). |
| DES-06 | partiel | — | — | Mise en page adaptable non vérifiée à 360 px ; message « clavier physique » sur mobile absent. |
| AUTH-01 | partiel | `app/api/auth/**`, `lib/auth/oauth.ts` | — | Discord, GitHub et mot de passe écrits ; OAuth jamais testé avec de vraies clés. |
| AUTH-02 | partiel | `lib/auth/guest.ts`, `lib/auth/pseudo.ts`, `app/api/auth/guest/route.ts`, `components/useRoomEntry.tsx` | `tests/unit/guest-pseudo.test.ts` | Pseudo 3–20 caractères validé par Zod, cookie JWT signé (7 jours). Parcours navigateur non encore vérifié. |
| AUTH-03 | partiel | `app/api/lobbies/route.ts`, `lib/lobby.ts` | — | Création refusée côté serveur aux invités (403) ; seuls les comptes peuvent être hôtes. Test automatisé à ajouter. Avatar généré pour invité à faire. |
| AUTH-04 | non fait | — | — | Téléversement de photo non implémenté. |
| AUTH-05 | non fait | — | — | Modification du pseudo non implémentée. |
| AUTH-06 | partiel | `app/profil/page.tsx` | — | Stats et progression MPM présentes ; victoires et MPM moyen à vérifier. |
| SALLE-01 | partiel | app/api/lobbies/route.ts, app/jouer/creer/page.tsx, lib/lobby.ts | tests/db/join.test.ts | Création réservée aux comptes ; l'hôte choisit participant ou spectateur (conservé au retour dans la salle). À valider par e2e. |
| SALLE-02 | complet | lib/lobby.ts, lib/lobby-snapshot.ts | tests/db/realtime.test.ts | Code 6 caractères sans 0/O/1/I/L, unicité vérifiée, affiché et diffusé en direct. |
| SALLE-03 | partiel | `db/migrations/0001_init.sql` | — | Trois valeurs d'accès existent ; sémantique « privée = lien d'invitation » absente. |
| SALLE-04 | non fait | — | — | Liens d'invitation à usage unique non implémentés. |
| SALLE-05 | partiel | lib/lobby-schema.ts, lib/lobby.ts | tests/db/join.test.ts | Capacité 2–30 (curseur corrigé), spectateurs hors capacité. Réglage éditable en salle d'attente : à faire. |
| SALLE-06 | complet | `db/migrations/0002_une_salle_et_corpus.sql`, `lib/lobby.ts` | `tests/db/rooms.test.ts` | Index uniques partiels + déclencheur de libération à la fermeture. Interface : message « déjà dans une salle » avec choix de quitter (`useRoomEntry`). |
| SALLE-07 | non fait | — | — | Expulsion non implémentée. |
| SALLE-08 | partiel | lib/lobby-sweep.ts, realtime/lobby-channel.ts | tests/db/sweep.test.ts | Hôte absent 30 s : transfert au compte connecté présent depuis le plus longtemps, sinon fermeture. Invités exclus du rôle d'hôte (interprétation). Pas encore géré pendant une course. |
| SALLE-09 | partiel | `app/api/lobbies/[code]/join/route.ts` | — | Refus pendant le décompte et la course ; accepté en attente et sur l écran des résultats. |
| SALLE-10 | non fait | — | — | Limite de tentatives par IP absente. |
| JOIN-01 | partiel | components/HomeActions.tsx, components/useLobbyLive.ts | tests/db/realtime.test.ts | Champ de code sur l'accueil ; liste des présents mise à jour en direct. Limitation de tentatives (SALLE-10) à faire. |
| JOIN-02 | partiel | `app/page.tsx` | — | Liste des salles publiques ; filtres et mise à jour sans rechargement absents. |
| JOIN-03 | partiel | `app/api/play/quick/route.ts` | — | Choisit la salle publique la plus proche de sa capacité maximale (égalité : la plus ancienne) ; état vide pour invité, création proposée aux comptes. |
| CONF-01 | complet | lib/lobby-schema.ts, app/jouer/creer/page.tsx | — | Durée max 15 s à 2 h (liste de 9 valeurs), validée par Zod. Éditable en salle d'attente : voir CONF-12. |
| CONF-02 | complet | lib/text/generate.ts | tests/unit/text-generate.test.ts | Langue du texte indépendante de la langue de l'interface. |
| CONF-03 | complet | lib/text/generate.ts, lib/text/service.ts, db/seed.ts | tests/db/seed.test.ts, tests/unit/text-generate.test.ts | Cohérent : passages du domaine public lus en base (repli embarqué si la base est vide). Aléatoire : dictionnaire en base. Passages transcrits de mémoire : à re-vérifier (voir docs/IA.md). |
| CONF-04 | complet | lib/lobby-schema.ts | tests/unit/text-generate.test.ts | Longueur en mots, 10 à 400. |
| CONF-05 | complet | lib/text/difficulty.ts | tests/unit/text-generate.test.ts | Critères mesurables (longueur des mots, accents, part de caractères spéciaux) documentés dans le code ; à recopier dans ARCHITECTURE.md. |
| CONF-06 | complet | lib/text/generate.ts | tests/unit/text-generate.test.ts | Ponctuation, nombres, majuscules, accents. En cohérent : le passage est adapté (accents/ponctuation retirés), apostrophes et traits d'union conservés. |
| CONF-07 | complet | lib/text/generate.ts, app/jouer/creer/page.tsx | tests/unit/text-generate.test.ts | Inclure/exclure : texte aléatoire seulement ; désactivé en mode cohérent (choix documenté). L'exclusion l'emporte sur l'inclusion. |
| CONF-08 | partiel | `app/course/[code]/page.tsx` | — | Modes « accumuler » et « bloquer » ; non vérifié de bout en bout. |
| CONF-09 | partiel | db/migrations/0005_configuration_du_texte.sql, app/jouer/creer/page.tsx | — | Réglage enregistré en base ; les bonus eux-mêmes ne sont pas encore implémentés (voir BONUS). |
| CONF-10 | partiel | `app/api/lobbies/[code]/bots/route.ts` | — | 4 niveaux au lieu de 5 ; retrait d'un bot absent. |
| CONF-11 | partiel | `app/jouer/creer/page.tsx` | — | Visibilité et capacité réglables à la création. |
| CONF-12 | non fait | `app/jouer/[code]/page.tsx` | — | Pas de modification de la configuration en salle d'attente, ni diffusion en direct. |
| COURSE-01 | partiel | `db/migrations/0001_init.sql` | — | États `lobby/countdown/racing/finished/closed` : à aligner sur la machine du cahier. |
| COURSE-02 | partiel | `app/api/lobbies/[code]/start/route.ts` | — | Minimum 2 participants bots inclus ; « au moins 1 humain » à vérifier. |
| COURSE-03 | partiel | `app/api/lobbies/[code]/start/route.ts` | — | Décompte de 5 s ; révélation du texte au début du décompte à vérifier. |
| COURSE-04 | partiel | `app/course/[code]/page.tsx` | — | Retour visuel, MPM et précision en direct, collage désactivé. |
| COURSE-05 | partiel | `app/course/[code]/page.tsx` | — | Classement en direct ; piste avec avatars et interpolation absente. |
| COURSE-06 | partiel | `realtime/server.ts` | — | Serveur calcule MPM et classement ; rejet des sauts de progression à compléter. |
| COURSE-07 | partiel | `realtime/server.ts` | — | Abandon existe ; confirmation à vérifier. |
| COURSE-08 | partiel | `realtime/server.ts` | — | Reconnexion possible ; délai de 30 s non implémenté. |
| COURSE-09 | partiel | `realtime/server.ts` | — | Fin par temps ou participants terminés. |
| COURSE-10 | partiel | `realtime/server.ts` | — | Classement terminé/non terminé ; abandons à revoir. |
| COURSE-11 | non fait | — | — | Relancer une course ou fermer la salle depuis les résultats absents. |
| BOT-01 | partiel | `realtime/bots.ts` | — | 4 niveaux ; il faut Noob, Débutant, Intermédiaire, Expert, Impossible. |
| BOT-02 | partiel | `realtime/bots.ts` | — | Variation de vitesse à renforcer. |
| BOT-03 | partiel | `realtime/bots.ts` | — | Erreurs simulées ; respect du mode d'erreur à vérifier. |
| BOT-04 | partiel | `realtime/server.ts` | — | Bots identifiés ; bonus/malus non applicables. |
| BOT-05 | partiel | `realtime/bots.ts` | — | Graine passée aux fonctions ; non testé unitairement. |
| BONUS-01 | non fait | — | — |  |
| BONUS-02 | non fait | — | — |  |
| BONUS-03 | non fait | — | — |  |
| BONUS-04 | non fait | — | — |  |
| RES-01 | partiel | `app/resultats/[code]/page.tsx` | — | Podium des 3 premiers. |
| RES-02 | partiel | `app/resultats/[code]/page.tsx` | — | Tableau du classement ; MPM brut, temps, statut et bonus à compléter. |
| RES-03 | partiel | `app/resultats/[code]/page.tsx`, `lib/heatmap.ts` | `tests/unit/heatmap.test.ts` | Carte de chaleur du clavier faite ; graphique de l'évolution du MPM absent. |
| RES-04 | non fait | — | — | Indicateur de record personnel absent. |
| RES-05 | partiel | `lib/stats.ts` | — | Résultats persistés ; série temporelle du MPM absente. |
| HIST-01 | non fait | `app/profil/page.tsx` | — | Seules les dernières courses sont affichées, sans pagination. |
| HIST-02 | non fait | — | — | Réaffichage d'une course passée absent. |
| I18N-01 | partiel | `lib/i18n.tsx` | — | Dictionnaire FR/EN avec interpolation et métadonnées ; la plupart des pages restent à migrer vers le dictionnaire. |
| I18N-02 | partiel | `lib/i18n.tsx`, `lib/i18n-dictionary.ts`, `lib/i18n-server.ts`, `app/layout.tsx` | — | Langue choisie côté serveur (cookie km_lang, sinon Accept-Language) : aucun flash. Sélecteur dans l en-tête de chaque page. Couverture des textes encore partielle (voir I18N-01). |
| I18N-03 | non fait | — | — | Formatage localisé des dates et nombres absent. |
| TEST-01 | partiel | `tests/unit/` | 9 tests | Texte, carte de chaleur, composants UI ; logique de course et bots à couvrir. |
| TEST-02 | partiel | `tests/e2e/home.spec.ts` | 2 parcours | Non exécuté dans cet environnement. |
| TEST-03 | partiel | `tests/e2e/` | — | Connexion par mot de passe seulement : aucun test d'authentification encore. |
| PERF-01 | non fait | — | — | Lighthouse non mesuré. |
| PERF-02 | partiel | realtime/protocol.ts | tests/unit/realtime-protocol.test.ts | Limiteur de débit côté serveur (120 msg/s en course, 30/10 s en salle). Le client envoie encore une progression par frappe : à regrouper. |
| PERF-03 | non fait | — | — | Non testé avec 30 participants. |
| A11Y-01 | partiel | — | — | Contrastes non vérifiés en WCAG AA. |
| A11Y-02 | partiel | — | — | Balises sémantiques partielles ; tableau des résultats à vérifier. |
| A11Y-03 | partiel | — | — | Textes alternatifs et libellés à auditer. |
| A11Y-04 | partiel | — | — | Parcours clavier et focus visible à auditer. |
| SEC-01 | partiel | `lib/lobby.ts`, `app/api/lobbies/[code]/**` | — | Démarrer, bots, fermer vérifiés côté serveur ; liens et expulsion à venir. |
| SEC-02 | non fait | — | — | Aucun téléversement pour l'instant. |
| SEC-03 | complet | `lib/auth/password.ts` | — | bcrypt (12 tours), jamais journalisé. |

## Choix documentés

- **Accès aux données** : Kysely (query builder) avec migrations SQL maison, plutôt qu'un ORM. Prisma a été écarté car son binaire n'est pas téléchargeable dans l'environnement de développement.
- **Ambiguïtés** : les règles floues du cahier (bonus, complexité, caractères exclus) seront tranchées et notées ici au fil de l'implémentation.
