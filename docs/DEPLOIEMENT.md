# Déploiement sur un VPS (TECH-05)

Ce guide met KeyMine en ligne en HTTPS sur un petit serveur Linux (Debian/Ubuntu) avec Docker. Tout est décrit dans le dépôt : `Dockerfile`, `deploy/docker-compose.prod.yml`, `deploy/Caddyfile`.

Architecture déployée : **Caddy** (HTTPS automatique, seul service exposé) → **web** (Next.js) et **realtime** (WebSocket, sous `/rt`) → **PostgreSQL**. Une étape **migrate** applique les migrations et le seed avant le démarrage.

## 1. Préparer le serveur

1. Louer un VPS (1 vCPU et 1 Go de RAM suffisent) ; noter son adresse IP.
2. Chez le registraire du nom de domaine, créer un enregistrement **A** `keymine.exemple.com → IP du serveur` (et **AAAA** si IPv6).
3. Se connecter en SSH et installer Docker :

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

4. Ouvrir les ports 80 et 443 (pare-feu du fournisseur et `ufw allow 80,443/tcp`). Ne pas exposer 5432.

## 2. Récupérer le code et configurer

```bash
git clone <url-du-depot> keymine && cd keymine
cp deploy/.env.prod.example deploy/.env.prod
nano deploy/.env.prod     # DOMAIN, POSTGRES_PASSWORD, SESSION_SECRET (openssl rand -base64 32)
```

`SEED_DEMO_USERS=true` crée les comptes de démonstration (voir le README) : utile pour la correction ; mettre `false` pour un vrai site public.

## 3. Lancer

```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
docker compose -f deploy/docker-compose.prod.yml logs -f web realtime
```

Au premier démarrage, Caddy obtient le certificat Let's Encrypt (quelques secondes). Vérifier : `https://<domaine>` charge le site, et la création d'une salle affiche la liste des joueurs en direct.

## 4. Mettre à jour

```bash
git pull
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod up -d --build
```

Les migrations déjà appliquées sont ignorées ; le seed est idempotent.

## 5. Sauvegarde et dépannage

- Sauvegarde : `docker compose -f deploy/docker-compose.prod.yml exec postgres pg_dump -U keymine keymine > sauvegarde.sql`
- Le WebSocket ne se connecte pas : vérifier que l'URL du site (`DOMAIN`) est exactement celle du navigateur (l'origine est contrôlée) et que `docker compose logs realtime` ne montre pas d'erreur.
- Changer de domaine : modifier `DOMAIN` puis reconstruire (`--build`), car l'adresse du WebSocket est figée dans le code client au build.
- OAuth (optionnel) : enregistrer les callbacks `https://<domaine>/api/auth/discord/callback` et `/api/auth/github/callback`.
