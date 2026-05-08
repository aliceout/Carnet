# Carnet

Carnet de recherche personnel auto-hébergé, équivalent self-hosted d'un carnet
Hypothèses. Astro SSR + Payload, dockerisé, sans pisteur.

## Stack

- **Astro 6** (SSR Node standalone) — site public
- **Payload CMS v3** (Next.js 16 + Lexical) — admin + API sous `/cms/*`
- **Postgres 16** — bind mount, `push: true` (pas de migration formelle)
- Tout dockerisé. Zéro build CI sur le serveur.

## Dev

Prérequis : Node 22+, pnpm 10+, Docker.

```bash
# Secrets (Dev Setup VS Code ou infisical CLI)
infisical export --env=dev --path=/ --format=dotenv > .env

# Deps
pnpm install
pnpm --dir services/payload install

# Postgres + Mailpit en bg
docker compose -f compose.dev.yml up -d

# Dev servers (un terminal par)
pnpm dev:api    # Payload → http://localhost:3001/cms/admin
pnpm dev:web    # Astro   → http://localhost:4321
```

Mailpit (capture des mails d'auth en local) : <http://localhost:8025>.

À chaque modif de schéma Payload :

```bash
pnpm --dir services/payload generate:types
pnpm --dir services/payload generate:importmap
```

Seed de démo (idempotent, refuse en prod) : `pnpm --dir services/payload seed:dev`

## Prod

Push sur `main` → GitHub Actions build les images → push GHCR → webhook VPS →
[`scripts/deploy.sh`](scripts/deploy.sh) fetch les secrets Infisical, pull les
nouvelles images, `docker compose up -d`.

Sample nginx (TLS terminé en amont, ports pilotés par Infisical
`prod/infra`) :

```nginx
server {
  listen 443 ssl http2;
  server_name <ton-domaine>;
  ssl_certificate     /etc/letsencrypt/live/<ton-domaine>/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/<ton-domaine>/privkey.pem;

  location /cms/ { proxy_pass http://127.0.0.1:${PORT_PAYLOAD}; }
  location /     { proxy_pass http://127.0.0.1:${PORT_SITE}; }
}
```

Setup initial du VPS (1×) : cloner le repo, écrire les creds Infisical
Universal Auth dans `~/.config/infisical/carnet.env`, lancer
`./scripts/deploy.sh`. Cf. [`compose.yml`](compose.yml) pour les ports
internes / volumes.

## Structure

```
src/                       App Astro SSR (pages, components, layouts)
services/payload/          CMS Payload (Next.js + Postgres) → /cms/admin
public/                    Assets statiques
scripts/deploy.sh          Déploiement VPS
compose.yml                Compose prod (db, payload, site)
compose.dev.yml            Compose dev (postgres + mailpit)
.env.example               Vars d'env consommées par la stack
```

## Backup

Données persistantes en bind mount sous `$DATA_DIR` (= `$HOME/data/carnet/`
par défaut) :

- `$DATA_DIR/postgres/` — DB Payload
- `$DATA_DIR/payload-media/` — uploads

Backup recommandé via `restic` cron côté VPS (hors compose). Restore manuel :

```bash
docker compose down
restic restore <snapshot-id> --target /
docker compose up -d
```

## Migrations

`postgres-adapter` en mode `push: true` : schéma DB synchronisé avec le code
à chaque boot. **Pas de migration à générer.**

Trade-off conscient : data peu critique (contenu éditorial), schéma sous
code review (toute évolution passe par PR), single-user. Voir
[issue #18](https://github.com/aliceout/carnet/issues/18) pour le débat
v2 sur les migrations formelles.

## Charte

Tokens dans [`src/styles/global.css`](src/styles/global.css). Couleur
d'accent et fond éditables depuis `/cms/admin/globals/site` (section
*Branding*) — palette de 5 teintes accent + 6 teintes fond.

Polices self-hostées via `@fontsource` : Source Serif 4 (corps), Inter
(UI), JetBrains Mono (technique).

## Sobriété, accessibilité, RGPD

WCAG AA visé. Aucun Google Fonts, aucun tracker, aucun cookie tiers. Sitemap
auto, OG par page, mentions légales + politique confidentialité présentes.
Pas de pop-up cookies — rien à consentir.

## Licence

Code : **AGPL-3.0** ([`LICENSE`](LICENSE)). Contenu (billets) :
**CC BY-NC-SA 4.0**.
