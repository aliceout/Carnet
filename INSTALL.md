# INSTALL — Carnet

Installation locale + déploiement VPS du carnet de recherche
[carnet.aliceosdel.org](https://carnet.aliceosdel.org).

---

## 1. Pré-requis

- **Node 22+** (`node -v`)
- **pnpm 10+** (`corepack enable && corepack use pnpm@latest`)
- **Docker** + **Docker Compose v2**
- (Optionnel) **Infisical CLI** pour récupérer les secrets dev :
  `https://infisical.com/docs/cli/overview`
- (Optionnel) **VS Code** + extension *Dev Setup* (auto-fetch des secrets
  Infisical au démarrage du workspace).

---

## 2. Setup local en dev

### Étape 1 — Secrets

Crée un fichier `.env` à la racine du repo. Deux options :

**Avec Infisical** (recommandé, équipe identique 2mains) :

```bash
infisical login --method=universal-auth \
  --domain=https://env.backlice.dev \
  --client-id=<ID> \
  --client-secret=<SECRET>
infisical export \
  --domain=https://env.backlice.dev \
  --projectId=<carnet-project-id> \
  --env=dev --path=/ --format=dotenv > .env
```

**Manuel** : copier `.env.example` → `.env` et remplir à la main. À
minima :

```
POSTGRES_USER=payload
POSTGRES_PASSWORD=payload
POSTGRES_DB=carnet
PAYLOAD_SECRET=$(openssl rand -hex 32)
PAYLOAD_PUBLIC_SERVER_URL=http://localhost:3001
PAYLOAD_INTERNAL_URL=http://localhost:3001
ASTRO_PUBLIC_PAYLOAD_URL=http://localhost:3001
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=dev
SMTP_PASS=dev
SMTP_SECURE=false
SMTP_FROM=noreply@carnet.local
SMTP_FROM_NAME=Carnet
```

### Étape 2 — Dépendances

```bash
pnpm install
pnpm --dir services/payload install
```

### Étape 3 — Postgres + Mailpit

```bash
docker compose -f compose.dev.yml up -d
```

Vérifie : `docker ps` doit afficher `carnet-db` (port 5432) et
`carnet-mailpit` (1025/8025).

### Étape 4 — Lancer le CMS et le site

Dans deux terminaux séparés :

```bash
pnpm dev:api    # Payload   → http://localhost:3001/cms/admin
pnpm dev:web    # Site Astro → http://localhost:4321
```

Mailpit (capture des mails d'auth en dev) : <http://localhost:8025>.

### Étape 5 — Premier compte admin

Au premier lancement de Payload sur une base vierge, navigue vers
<http://localhost:3001/cms/admin>. Payload affiche un écran « Créer le
premier utilisateur ». Cet utilisateur deviendra **automatiquement
`root`** au boot suivant (cf. `bootstrapRootUser` dans
`payload.config.ts`).

Pour inviter d'autres comptes ensuite : bouton « Inviter un
utilisateur » au-dessus de la liste `users`. Le mail d'invitation est
capturé par Mailpit en dev.

### Étape 6 — Générer les types TypeScript

À chaque modification d'une collection ou d'un block :

```bash
pnpm --dir services/payload generate:types
pnpm --dir services/payload generate:importmap
```

`payload-types.ts` est consommé par le client Astro
(`src/lib/payload.ts`) pour le typage strict.

### Étape 7 — (optionnel) Charger les données de démo

Pour avoir un site déjà rempli en local — 8 thèmes, 4 entrées de
bibliographie, 13 billets fictifs (dont l'article démo
*L'homonationalisme a-t-il une diplomatie ?*), une page À propos,
et le global Site :

```bash
pnpm --dir services/payload seed:dev          # idempotent (skip si existe)
pnpm --dir services/payload seed:dev:reset    # wipe puis remplit
```

Refuse de tourner si `NODE_ENV=production`. Source des données :
`Design/design_handoff_carnet/carnet-b-app.jsx`. Le script ne charge
**pas** les blocks Lexical custom (Footnote, BiblioInline) — leur
intégration est livrée avec le port du frontend (issue #12).

---

## 3. Workflow d'écriture d'un billet

1. Aller sur `/cms/admin` → collection **Billets** → « Créer un nouveau
   billet ».
2. Remplir :
   - `Numéro` (entier unique, ex. 42 → affiché « n° 042 »)
   - `Titre`, `Slug`, `Type` (Analyse / Note / Fiche)
   - `Thèmes` (multivalués, créés à la volée si besoin via la
     collection **Thèmes**)
   - `Date de publication`
   - `Chapô` (deck)
   - `Corps` (Lexical — slash menu pour insérer Footnote, CitationBloc,
     BiblioInline, Figure)
   - `Bibliographie` (relations vers la collection **Bibliographie**)
3. Cocher / décocher `Brouillon` selon publication.
4. Sauvegarder. Le site Astro fetch Payload en SSR — la modification est
   visible immédiatement sur `/billets/<slug>/`, pas de rebuild.

`readingTime` et `idCarnet` sont calculés automatiquement.

---

## 4. Déploiement VPS

### Pré-requis VPS

- Docker + Docker Compose v2
- Reverse proxy nginx déjà en place qui termine TLS et route les
  sous-domaines (cf. infra Alice)
- Infisical CLI installé + Machine Identity Universal Auth créée pour
  ce projet
- DNS `carnet.aliceosdel.org` pointant sur le VPS

### Setup initial (1×)

```bash
# Clone le repo dans /var/www/carnet (ou autre)
sudo mkdir -p /var/www/carnet && sudo chown $USER /var/www/carnet
cd /var/www
git clone https://github.com/aliceout/carnet.git
cd carnet

# Creds Infisical bootstrap
mkdir -p $HOME/.config/infisical
cat > $HOME/.config/infisical/carnet.env <<EOF
INFISICAL_API_URL=https://env.backlice.dev
INFISICAL_PROJECT_ID=<carnet-project-id>
INFISICAL_CLIENT_ID=<universal-auth-client-id>
INFISICAL_CLIENT_SECRET=<universal-auth-client-secret>
INFISICAL_ENV=prod
EOF
chmod 600 $HOME/.config/infisical/carnet.env

# Premier deploy
./scripts/deploy.sh
```

### nginx hôte (sample)

```nginx
server {
  listen 443 ssl http2;
  server_name carnet.aliceosdel.org;

  ssl_certificate     /etc/letsencrypt/live/carnet.aliceosdel.org/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/carnet.aliceosdel.org/privkey.pem;

  # Admin Payload + API
  location /cms/ {
    proxy_pass http://127.0.0.1:8068;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Site public Astro (catch-all)
  location / {
    proxy_pass http://127.0.0.1:8067;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### CI/CD

Push sur `main` → workflow GitHub Actions build les images Docker →
push GHCR (`ghcr.io/aliceout/carnet-{payload,site}:latest`) → webhook VPS
appelle `scripts/deploy.sh` → fetch secrets Infisical → `docker compose
pull && up -d` → attente healthchecks (90 s).

> ⚠️ Le workflow CI lui-même n'est **pas** dans ce scaffolding (à mettre
> dans `.github/workflows/` selon ta convention VPS — voir `2mains/.github/`
> pour référence).

### Ports prod

- `127.0.0.1:8067` → site Astro (public)
- `127.0.0.1:8068` → Payload (admin + API sous `/cms/*`)
- Postgres : interne réseau Docker uniquement

Tu peux changer ces ports librement dans `compose.yml` selon ce qui est
libre sur ton VPS.

---

## 5. Backup

Les données persistantes sont dans `$DATA_DIR/postgres` et
`$DATA_DIR/payload-media` (= `$HOME/data/carnet/` par défaut). Backup
recommandé via `restic` cron côté VPS, hors compose. Cf. issue v2
*Backup automatique DB* pour intégrer un service dédié.

Restore manuel :

```bash
docker compose down
restic restore <snapshot-id> --target /
docker compose up -d
```

---

## 6. Mises à jour et migrations

`postgres-adapter` est en mode `push: true` : à chaque boot Payload
synchronise le schéma DB avec les collections déclarées dans le code.
**Pas de migrations à générer**.

Trade-off conscient : data peu critique (contenu éditorial), schéma
sous code review (toute évolution passe par PR), un seul user. Pour
introduire des migrations formelles à terme, voir issue v2
*Adopter les migrations Postgres formelles*.

Pour mettre à jour Payload ou les deps : éditer `services/payload/package.json`,
`pnpm install --filter ./services/payload`, tester en local, commit, push.
Le CI rebuilde les images, le webhook redeploie en prod.
