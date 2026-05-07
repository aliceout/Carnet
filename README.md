# Carnet — site de recherche d'Alice Aussel Delamaide

Carnet de recherche personnel auto-hébergé, équivalent self-hosted d'un carnet
Hypothèses. Publie des billets longs en français — analyses, notes de lecture,
fiches thématiques — autour du genre, de la géopolitique et des droits LGBTQI+
dans les rapports internationaux.

URL prod : [carnet.aliceosdel.org](https://carnet.aliceosdel.org).

Stack : **Astro 6 SSR** (Node standalone) + **Payload CMS v3** + **Postgres 16**,
self-hosté en Docker. Aucun pisteur, aucune dépendance externe inutile, lisible
sans JavaScript.

---

## Démarrage en local

Prérequis : Node 22+, pnpm 10+, Docker.

```bash
# 1. Récupérer les secrets dev dans .env (via DvSetup VS Code ou infisical CLI)

# 2. Installer les deps (1× par service)
pnpm install
pnpm --dir services/payload install
pnpm --dir services/mail install

# 3. Postgres + Mailpit en arrière-plan
docker compose -f compose.dev.yml up -d

# 4. Lancer (un terminal par process)
pnpm dev:api    # admin Payload   → http://localhost:3001/cms/admin
pnpm dev:web    # site Astro      → http://localhost:4321
pnpm dev:mail   # backend mail    → http://localhost:3000  (optionnel)
```

Mailpit (capture les mails envoyés en local — invitations, OTP 2FA) :
<http://localhost:8025>.

---

## Déploiement en prod

Push sur `main` → CI build les images Docker → push GHCR → webhook VPS →
`scripts/deploy.sh` fetch les secrets Infisical (env `prod`), pull les nouvelles
images, `compose up -d`. **Aucun build sur le serveur.**

Données persistantes en bind mount sous `$HOME/data/carnet/` (Postgres + uploads
Payload), backup `restic` cron côté infra VPS (hors compose).

Voir [`compose.yml`](compose.yml) et [`scripts/deploy.sh`](scripts/deploy.sh)
pour le détail. Voir aussi [`INSTALL.md`](INSTALL.md) pour le setup complet.

---

## Structure

```
src/                       App Astro SSR (pages, components, layouts)
services/
├── payload/               CMS Payload (Next.js + Postgres) → /cms/admin
└── mail/                  Backend mail (Hono + nodemailer) → /api/*
public/                    Assets statiques + fonts self-hostées
scripts/deploy.sh          Script de déploiement VPS
compose.yml                Compose prod (db, payload, site, mail)
compose.dev.yml            Compose dev (postgres + mailpit)
```

---

## Contenu

Édité par Alice via **`/cms/admin`**, persisté en Postgres, lu par Astro en
SSR à chaque requête (pas de rebuild, modifs visibles immédiatement).

Collections Payload :

- **Posts** — billets du carnet : `numero`, `titre`, `slug`, `type`
  (analyse / note / fiche), `themes` (relation multi vers `Themes`),
  `published_at`, `updated_at`, `lede`, `body` (Lexical), `bibliography`
  (relations vers `Bibliography`), `reading_time` auto, `id_carnet` auto.
- **Themes** — taxonomie multivaluée des sujets (slug, nom, description).
- **Bibliography** — références académiques réutilisables entre billets
  (auteur, année, titre, éditeur, lieu, pages, type).
- **Pages** — pages éditoriales libres avec blocks Lexical (À propos,
  Colophon, Mentions légales, Accessibilité, RGPD).
- **Media** — uploads.
- **Users** — auth-enabled (cf. ci-dessous).

Global **Site** — réglages (footer, baseline, liens sociaux, copyright).

**Comptes admin** : invitations par mail uniquement (lien valable 7 jours,
2FA email par défaut, TOTP en option). Le premier user créé sur une base
neuve devient `root` automatiquement au boot suivant.

---

## Charte

Tokens du design (cf [`src/styles/global.css`](src/styles/global.css), à venir) :

| Token | Valeur | Usage |
|---|---|---|
| `--b-ink` | `#1a1d28` | Texte principal, titres |
| `--b-bg` | `#fdfcf8` | Fond global |
| `--b-paper` | `#ffffff` | Bloc citation |
| `--b-rule` | `#d6d3c8` | Filets, bordures |
| `--b-muted` | `#5e6373` | Métadonnées, légendes |
| `--b-accent` | `#5a3a7a` | Liens externes, kicker, signature |

Typographies (self-hostées via `@fontsource/*`) :

- **Source Serif 4** (400 / 500 / 600) — corps article, titres éditoriaux
- **Inter** (400 / 500 / 600) — UI : nav, méta, kicker, footer, chips
- **JetBrains Mono** (400 / 500) — IDs, tags, mono technique

---

## Sobriété, accessibilité, RGPD

WCAG AA visé. Aucun Google Fonts, aucun tracker, aucun cookie tiers. Sitemap
auto, OG par page, mentions légales + politique confidentialité présentes.
Pas de pop-up cookies (rien à consentir).

Code sous **AGPLv3** ([`LICENSE`](LICENSE)). Contenu (billets) sous
**CC BY-NC-SA 4.0**.
