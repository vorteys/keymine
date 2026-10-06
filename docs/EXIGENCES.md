# Matrice de traçabilité des exigences

Version initiale — état après le commit `7280b6e`. Source : `docs/cahier-des-charges.pdf`.

Statuts : **complet** (fait et vérifié), **partiel** (existe mais incomplet ou non vérifié), **non fait**. Ce fichier est mis à jour dans le même commit que chaque changement.

| ID | Statut | Fichiers principaux | Tests associés | Notes et choix |
| --- | --- | --- | --- | --- |
| TECH-01 | complet | `app/`, `next.config.ts` | — | Next.js 16 App Router, React 19. |
| TECH-02 | partiel | `tsconfig.json`, `eslint.config.mjs` | `bun run lint`, `bun run typecheck` (CI) | `strict: true`, aucun `any` explicite, aucun `@ts-ignore`. Restent des fichiers `.mjs` (`scripts/*.mjs`, configs) à porter en TypeScript. |
| TECH-03 | complet | `app/globals.css`, composants | — | Tailwind v4. |
| TECH-04 | complet | db/migrations/, db/migrate.ts, db/seed.ts, db/types.ts | tests/db/seed.test.ts | PostgreSQL + Kysely (query builder, pas un ORM : choix à défendre dans l'ADR). Migrations SQL versionnées ; seed idempotent (corpus, dictionnaires, 5 comptes de démo + historique), lancé par bun run db:seed. |
| TECH-05 | partiel | Dockerfile, deploy/, docs/DEPLOIEMENT.md | — | Fichiers de déploiement prêts (Docker, Caddy HTTPS, guide) mais NON testés ici (pas de Docker dans l'environnement) et pas encore déployés : à faire par l'équipe. |
| TECH-06 | partiel | realtime/server.ts, realtime/lobby-channel.ts, components/useLobbyLive.ts | tests/db/realtime.test.ts | WebSocket (ws) authentifié par cookie signé + contrôle d'origine ; salle d'attente en direct via LISTEN/NOTIFY avec repli HTTP. Course : protocole validé, mais la fréquence d'envoi côté client n'est pas encore réduite. |
| TECH-07 | partiel | realtime/protocol.ts, lib/lobby-schema.ts, app/api/** | tests/unit/realtime-protocol.test.ts | Messages WebSocket validés par Zod (course et salle). Couverture Zod des routes API restant à auditer route par route. |
| TECH-08 | complet | — | — | Aucun service payant ; Postgres embarqué en dev seulement. |
| TECH-09 | partiel | .github/workflows/ci.yml | tests/unit, tests/db | CI : lint, typecheck, tests unitaires, migrations, tests base, build, e2e. Non encore vérifiée sur GitHub (premier push à faire). |
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
| SALLE-03 | partiel | lib/lobby-access.ts, app/api/lobbies/[code]/join/route.ts, app/page.tsx | tests/db/invites.test.ts | Publique : listée + code ; Sur code : code ou lien, non listée ; Privée : lien d'invitation seulement (l'hôte et les présents restent admis). Interface à valider dans un navigateur. |
| SALLE-04 | partiel | db/migrations/0007_invitations_et_expulsions.sql, lib/invites.ts, lib/invite-token.ts, app/api/lobbies/[code]/invites/route.ts, app/api/invites/[token]/route.ts, app/rejoindre/[token]/page.tsx, components/lobby/InvitePanel.tsx | tests/db/invites.test.ts, tests/unit/client-ip.test.ts | Jeton de 256 bits ; plusieurs liens avec statut (non utilisé / utilisé par / révoqué) ; usage unique lié à l'IP (mise à jour atomique), réutilisable par la même IP ; révoqué à l'expulsion et à la fermeture. L'IP vient du dernier X-Forwarded-For : suppose le reverse proxy du déploiement. Interface non vérifiée dans un navigateur. |
| SALLE-05 | partiel | lib/lobby-schema.ts, lib/lobby.ts | tests/db/join.test.ts | Capacité 2–30 (curseur corrigé), spectateurs hors capacité. Réglage éditable en salle d'attente : à faire. |
| SALLE-06 | complet | `db/migrations/0002_une_salle_et_corpus.sql`, `lib/lobby.ts` | `tests/db/rooms.test.ts` | Index uniques partiels + déclencheur de libération à la fermeture. Interface : message « déjà dans une salle » avec choix de quitter (`useRoomEntry`). |
| SALLE-07 | partiel | lib/bans.ts, app/api/lobbies/[code]/kick/route.ts, app/jouer/[code]/page.tsx | tests/db/invites.test.ts | L'hôte expulse un participant ou un spectateur (en attente ou sur les résultats) ; interdit de retour (compte ou invité) et lien révoqué. Interface non vérifiée dans un navigateur. |
| SALLE-08 | partiel | lib/lobby-sweep.ts, realtime/lobby-channel.ts | tests/db/sweep.test.ts | Hôte absent 30 s : transfert au compte connecté présent depuis le plus longtemps, sinon fermeture. Invités exclus du rôle d'hôte (interprétation). Pas encore géré pendant une course. |
| SALLE-09 | partiel | `app/api/lobbies/[code]/join/route.ts` | — | Refus pendant le décompte et la course ; accepté en attente et sur l écran des résultats. |
| SALLE-10 | partiel | lib/join-limit.ts, app/api/lobbies/[code]/join/route.ts, app/api/invites/[token]/route.ts | tests/db/invites.test.ts | 10 tentatives échouées par minute et par IP (code inconnu, salle privée sans lien, lien invalide) puis 429 ; les entrées réussies ne comptent pas (une classe derrière une même IP peut jouer). |
| JOIN-01 | partiel | components/HomeActions.tsx, components/useLobbyLive.ts | tests/db/realtime.test.ts | Champ de code sur l'accueil ; liste des présents mise à jour en direct. Limitation de tentatives (SALLE-10) à faire. |
| JOIN-02 | partiel | `app/page.tsx` | — | Liste des salles publiques ; filtres et mise à jour sans rechargement absents. |
| JOIN-03 | partiel | `app/api/play/quick/route.ts` | — | Choisit la salle publique la plus proche de sa capacité maximale (égalité : la plus ancienne) ; état vide pour invité, création proposée aux comptes. |
| CONF-01 | complet | lib/lobby-schema.ts, components/lobby/SettingsForm.tsx | tests/db/settings.test.ts | Durée max 15 s à 2 h (9 valeurs), validée par Zod, modifiable en salle d'attente. |
| CONF-02 | complet | lib/text/generate.ts | tests/unit/text-generate.test.ts | Langue du texte indépendante de la langue de l'interface. |
| CONF-03 | complet | lib/text/generate.ts, lib/text/service.ts, db/seed.ts | tests/db/seed.test.ts, tests/unit/text-generate.test.ts | Cohérent : passages du domaine public lus en base (repli embarqué si la base est vide). Aléatoire : dictionnaire en base. Passages transcrits de mémoire : à re-vérifier (voir docs/IA.md). |
| CONF-04 | complet | lib/lobby-schema.ts | tests/unit/text-generate.test.ts | Longueur en mots, 10 à 400. |
| CONF-05 | complet | lib/text/difficulty.ts | tests/unit/text-generate.test.ts | Critères mesurables (longueur des mots, accents, part de caractères spéciaux) documentés dans le code ; à recopier dans ARCHITECTURE.md. |
| CONF-06 | complet | lib/text/generate.ts | tests/unit/text-generate.test.ts | Ponctuation, nombres, majuscules, accents. En cohérent : le passage est adapté (accents/ponctuation retirés), apostrophes et traits d'union conservés. |
| CONF-07 | complet | lib/text/generate.ts, components/lobby/SettingsForm.tsx | tests/unit/text-generate.test.ts, tests/db/settings.test.ts | Inclure/exclure : texte aléatoire seulement ; désactivé en mode cohérent (choix documenté). L'exclusion l'emporte ; un caractère ne peut être dans les deux listes. |
| CONF-08 | partiel | `app/course/[code]/page.tsx` | — | Modes « accumuler » et « bloquer » ; non vérifié de bout en bout. |
| CONF-09 | complet | lib/race/bonus.ts, components/lobby/SettingsForm.tsx, app/api/lobbies/[code]/start/route.ts | tests/unit/race-bonus.test.ts, tests/unit/race-engine.test.ts | Réglage enregistré (modifiable en salle d'attente) et copié dans la course ; sans l'option, aucun bonus n'est attribué. |
| CONF-10 | partiel | app/api/lobbies/[code]/bots/route.ts, lib/lobby-bots.ts, app/jouer/[code]/page.tsx | tests/db/settings.test.ts | 5 niveaux ; ajout et retrait (bouton × pour l'hôte) en salle d'attente, capacité respectée ; rendu non vérifié dans un navigateur. |
| CONF-11 | partiel | components/lobby/SettingsForm.tsx, lib/lobby-settings.ts | tests/db/settings.test.ts | Visibilité et capacité réglables à la création et en salle d'attente (capacité jamais sous le nombre de participants). |
| CONF-12 | partiel | components/lobby/HostSettingsEditor.tsx, components/lobby/SettingsForm.tsx, lib/lobby-settings.ts, app/api/lobbies/[code]/route.ts | tests/db/settings.test.ts | Réglages modifiables par l'hôte en salle d'attente (PATCH validé par Zod, refusé hors attente, capacité et inclure/exclure contrôlés) ; la notification Postgres diffuse le changement à tous (testé). Formulaire partagé avec la création. Rendu non vérifié dans un navigateur. |
| COURSE-01 | complet | lib/race/state.ts, app/api/lobbies/[code]/start/route.ts, realtime/race-room.ts | tests/unit/race-state.test.ts, tests/db/race.test.ts | Machine à états codée (table de transitions) ; diagramme dans ARCHITECTURE.md. Transitions appliquées au démarrage (verrou transactionnel) et en fin de course. |
| COURSE-02 | complet | lib/race/state.ts, app/api/lobbies/[code]/start/route.ts | tests/unit/race-state.test.ts | ≥ 2 participants dont ≥ 1 humain, bots comptés, spectateurs non. |
| COURSE-03 | partiel | app/api/lobbies/[code]/start/route.ts, app/course/[code]/page.tsx | tests/db/race.test.ts | Décompte de 3 s fixé côté serveur (starts_at) et affiché 3, 2, 1 ; texte envoyé seulement à partir du décompte. Rendu à valider dans un navigateur. |
| COURSE-04 | partiel | app/course/[code]/page.tsx, components/race/ | tests/unit/race-engine.test.ts | Retour visuel caractère par caractère, MPM/précision en direct, collage bloqué ; calculs testés, rendu non vérifié dans un navigateur. |
| COURSE-05 | partiel | components/race/Track.tsx, app/course/[code]/page.tsx | — | Piste avec avatar, nom, position et MPM, mises à jour toutes les 250 ms ; fluidité à valider dans un navigateur. |
| COURSE-06 | complet | lib/race/engine.ts, realtime/race-room.ts | tests/unit/race-engine.test.ts, tests/db/race.test.ts | Départ, fin, progression, classement et bonus décidés par le serveur ; sauts et vitesses irréalistes (> 250 MPM + marge) rejetés ; MPM jamais lu du client. |
| COURSE-07 | partiel | app/course/[code]/page.tsx, lib/race/engine.ts | tests/unit/race-engine.test.ts, tests/db/race.test.ts | Bouton ABANDONNER avec boîte de confirmation ; abandon testé côté serveur ; boîte non vérifiée dans un navigateur. |
| COURSE-08 | partiel | lib/race/engine.ts, realtime/race-room.ts | tests/unit/race-engine.test.ts | Moteur : reprise sous 30 s, abandon au-delà (testé). Côté page de course : rechargement à vérifier manuellement. |
| COURSE-09 | complet | lib/race/engine.ts | tests/unit/race-engine.test.ts, tests/db/race.test.ts | Fin quand tous ont terminé/abandonné ou temps écoulé. |
| COURSE-10 | complet | lib/race/engine.ts | tests/unit/race-engine.test.ts | Arrivés par temps, puis temps écoulé par progression, puis abandons par progression. |
| COURSE-11 | partiel | app/api/lobbies/[code]/rematch/route.ts, app/api/lobbies/[code]/route.ts, components/results/ResultsActions.tsx | — | REJOUER (hôte) remet la salle en attente avec les mêmes participants ; l'hôte modifie ensuite la configuration (CONF-12) ; FERMER LA SALLE ; les autres suivent la salle et y reviennent automatiquement. Pas encore de test automatisé de la route rematch ni de vérification dans un navigateur. |
| BOT-01 | complet | lib/race/bots.ts | tests/unit/race-bots.test.ts | Noob, Débutant, Intermédiaire, Expert, Impossible ; plages et taux d'erreur documentés dans le code. |
| BOT-02 | complet | lib/race/bots.ts | tests/unit/race-bots.test.ts | Accélérations, hésitations aux espaces, ralentissement sur mots longs/accentués. |
| BOT-03 | complet | lib/race/bots.ts | tests/unit/race-bots.test.ts | Erreurs avec temps de correction ; correction obligatoire plus lente que le mode libre. |
| BOT-04 | complet | lib/race/bots.ts, lib/race/engine.ts | tests/unit/race-engine.test.ts | Nommés « Bot … » et marqués isBot dans l'état ; soumis aux bonus. L'affichage dans l'interface de course reste à finaliser. |
| BOT-05 | complet | lib/race/bots.ts, lib/text/rng.ts | tests/unit/race-bots.test.ts | Moteur déterministe à partir d'une graine ; l'arrivée est indépendante de la cadence du tick. |
| BONUS-01 | complet | lib/race/bonus.ts, lib/race/engine.ts | tests/unit/race-bonus.test.ts, tests/unit/race-engine.test.ts | Règle documentée dans ARCHITECTURE.md §7 : points de contrôle à 25/50/75 % du meneur, retardataire = dernier ou > 25 points, 1 bonus par point, 3 max. |
| BONUS-02 | complet | lib/race/bonus.ts | tests/unit/race-engine.test.ts | Trois types : -3 mots (retardataire), +3 mots (meneur), brouillard (meneur). |
| BONUS-03 | partiel | app/course/[code]/page.tsx, components/race/Track.tsx | — | Annonce diffusée à tous sur la piste et bannière chez le joueur ciblé ; rendu à valider dans un navigateur. |
| BONUS-04 | complet | lib/race/engine.ts | tests/unit/race-engine.test.ts | Progression et MPM mesurés sur le texte courant du joueur ; bots re-simulés. |
| RES-01 | partiel | app/resultats/[code]/page.tsx | — | Podium des 3 premiers ; rendu à valider visuellement. |
| RES-02 | complet | app/resultats/[code]/page.tsx, lib/results.ts | tests/db/history.test.ts | Rang, participant, MPM, MPM brut, précision, erreurs, temps, statut (terminé/temps écoulé/abandon) et bonus reçus. |
| RES-03 | complet | components/results/WpmChart.tsx, lib/heatmap.ts | tests/unit/heatmap.test.ts, tests/db/history.test.ts | Deux graphiques : MPM de tous les participants dans le temps (SVG accessible) et clavier en carte de chaleur. |
| RES-04 | complet | lib/results.ts, app/resultats/[code]/page.tsx | tests/db/history.test.ts | Bandeau « nouveau record personnel » si le MPM dépasse toutes les courses terminées précédentes du compte. |
| RES-05 | complet | realtime/race-room.ts, lib/results.ts | tests/db/race.test.ts, tests/db/history.test.ts | Résultats et série temporelle du MPM (wpm_series) persistés ; les graphiques se réaffichent depuis la base. |
| HIST-01 | complet | app/historique/page.tsx, lib/history.ts | tests/db/history.test.ts | Historique paginé (10 par page) du compte connecté, plus récent d'abord. |
| HIST-02 | complet | app/historique/page.tsx, app/resultats/[code]/page.tsx | tests/db/history.test.ts | Chaque ligne ouvre /resultats/CODE?course=ID ; accès limité aux participants de la course. |
| I18N-01 | partiel | `lib/i18n.tsx` | — | Dictionnaire FR/EN avec interpolation et métadonnées ; la plupart des pages restent à migrer vers le dictionnaire. |
| I18N-02 | partiel | `lib/i18n.tsx`, `lib/i18n-dictionary.ts`, `lib/i18n-server.ts`, `app/layout.tsx` | — | Langue choisie côté serveur (cookie km_lang, sinon Accept-Language) : aucun flash. Sélecteur dans l en-tête de chaque page. Couverture des textes encore partielle (voir I18N-01). |
| I18N-03 | partiel | lib/format.ts, app/resultats/[code]/page.tsx, app/historique/page.tsx | — | Dates, nombres, pourcentages et durées formatés selon la langue sur les résultats et l'historique ; autres pages à migrer. |
| TEST-01 | partiel | `tests/unit/` | 9 tests | Texte, carte de chaleur, composants UI ; logique de course et bots à couvrir. |
| TEST-02 | partiel | `tests/e2e/home.spec.ts` | 2 parcours | Non exécuté dans cet environnement. |
| TEST-03 | partiel | `tests/e2e/` | — | Connexion par mot de passe seulement : aucun test d'authentification encore. |
| PERF-01 | non fait | — | — | Lighthouse non mesuré. |
| PERF-02 | partiel | realtime/protocol.ts, realtime/race-room.ts | tests/unit/realtime-protocol.test.ts | Limiteur côté serveur (25 msg/s en course). Le client envoie encore une progression par frappe : à regrouper. |
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
