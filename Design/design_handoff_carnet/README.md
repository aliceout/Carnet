# Handoff : Carnet — site de recherche personnel d'Alice Aussel Delamaide

## Vue d'ensemble

Carnet est un site de recherche scientifique personnel auto-hébergé (équivalent
self-hosted d'un carnet Hypothèses). Il publie des billets longs en français —
analyses, notes de lecture, fiches thématiques — autour du genre, de la
géopolitique et des droits LGBTQI+ dans les rapports internationaux.

URL cible : `carnet.aliceosdel.org`

Stack visée : **Ghost (dockerisé) avec un thème Handlebars custom**. Pas de
framework JS lourd, lisible avec JS désactivé, sans pisteur, sans dépendance
externe inutile.

---

## À propos des fichiers de design

Les fichiers de ce bundle sont des **références de design en HTML/JSX** —
des prototypes qui montrent le rendu et le comportement visés, **pas du code
de production à copier-coller**.

La tâche du développeur : **recréer ces designs dans un thème Ghost
Handlebars** (`{{!< default}}`, partials, helpers, `{{#foreach}}`, etc.) en
respectant la structure éditoriale et la grille typographique. Le
JSX/React du prototype n'a aucune valeur en production : c'est uniquement
l'IA qui interprète la maquette. La forme finale doit être du HTML statique
généré côté serveur par Ghost, plus un peu de CSS et un strict minimum de
JS progressif (filtres d'accueil, table des matières active, indicateur de
progression).

---

## Fidélité

**Hi-fi.** Le prototype fixe :
- la palette exacte (variables CSS énumérées plus bas),
- la typographie (Source Serif 4 + Inter + JetBrains Mono via **Bunny Fonts**,
  pas Google Fonts),
- la grille (article 660 px de corps + 220 px de marge à droite pour les
  sidenotes optionnelles ; gutter 60 px),
- les états (hover sur lien d'item, TOC actif, chip filtre actif),
- les espacements (les paddings de section, les hauteurs de meta-strip,
  l'épaisseur des filets : 1 px `--b-rule`),
- les paramètres par défaut **fixés par le client** :
  - **accent** : violet `#5a3a7a`
  - **fond** : presque-blanc `#fdfcf8` (paper dérivé `#ffffff`)
  - **notes** : classiques (en pied d'article)
  - **lettrine** : oui
  - **texte** : justifié (avec `hyphens: auto`)
  - **densité du flux d'accueil** : serrée

Le panneau « Tweaks » du prototype existe pour explorer des variantes ; il ne
doit **pas** être livré dans Ghost. Seules les valeurs par défaut ci-dessus
sont à implémenter.

---

## Tokens de design

Toutes les valeurs sont déclarées comme variables CSS sur `:root` dans le
prototype et doivent être reprises telles quelles.

### Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--b-ink` | `#1a1d28` | Texte principal, titres |
| `--b-bg` | `#fdfcf8` | Fond global du site |
| `--b-paper` | `#ffffff` | Fond du bloc « Pour citer cet article » |
| `--b-rule` | `#d6d3c8` | Filets, bordures |
| `--b-muted` | `#5e6373` | Métadonnées, légendes, navigation |
| `--b-accent` | `#5a3a7a` | Liens externes, kicker rubrique, signature |

Le texte courant article est `#22242e` ; les paragraphes des items d'accueil
et de la bibliographie sont `#3b3f4d`.

### Typographie

Polices servies depuis **Bunny Fonts** (équivalent privacy-first de Google
Fonts). À auto-héberger en production via WOFF2 dans `/assets/fonts/`.

```css
@import url("https://fonts.bunny.net/css?family=source-serif-4:400,400i,500,600,700|inter:400,500,600,700|jetbrains-mono:400,500");
```

| Rôle | Famille | Poids |
|---|---|---|
| Corps & titres éditoriaux | Source Serif 4 | 400 / 500 / 600 |
| UI (nav, méta, kicker, footer, chips) | Inter | 400 / 500 / 600 |
| ID, tags, monospace technique | JetBrains Mono | 400 / 500 |

Échelle (toutes en px) :

- Hero h1 accueil : 64 / 1.04 / -0.7
- Article h1 : 52 / 1.08 / -0.7
- Article deck : 22 / 1.5
- Article h2 : 30 / 1.2
- Article h3 : 22
- Corps article : 19 / 1.7 (`#22242e`)
- Item d'accueil h2 : 26 / 1.2
- Item d'accueil paragraphe : 16 / 1.55
- Kicker / lbl meta : 11–12 px, `letter-spacing: .08–.14em`, uppercase
- Tag / mono : 10.5–12 px, JetBrains Mono

### Espacement

- Container principal : `max-width: 1280px`, padding 80 px gauche/droite
- Container étroit (À propos) : `max-width: 980px`, padding 80 px
- Bloc article (corps + sidenotes) : `max-width: 920px`, grid `minmax(0,640px) 220px`, gap 60 px
- Bloc article notes classiques (mode actif) : `max-width: 720px` centré
- Densité serrée du flux d'accueil : multiplicateur `--b-density: 0.7` sur
  les paddings d'item (`padding: calc(40px * var(--b-density)) 0`)

### Filets, ombres, rayons

- Filet : 1 px `--b-rule`
- Ombre : aucune (le carnet est plat)
- Rayon : 4 px sur le bloc « Pour citer cet article » uniquement, 999 px sur les chips de filtre, sinon 0

---

## Pages à implémenter (templates Handlebars)

Pour chaque page, voir le prototype `Carnet B.html` rendu via
`carnet-b-app.jsx`. Ci-dessous : le mapping vers les templates Ghost et la
structure attendue.

### 1. `default.hbs` — chrome partagé

- **Header non sticky.** `header.site` : `Carnet.` à gauche (Source Serif 4,
  600, 22 px ; le point en `--b-accent`), nav à droite (Inter 13, muted →
  ink + filet `--b-accent` 1.5 px sur l'item actif).
- Items de nav : Billets (`/`), Archives (`/archives/`), Pôles (`/pole/`),
  À propos (`/about/`), RSS (`/rss/`).
- **Footer.** Trois colonnes : signature + baseline + copyright CC BY-NC-SA
  4.0 ; « Naviguer » ; « Suivre » (RSS, Mastodon, Bluesky, Colophon).

### 2. `index.hbs` — page d'accueil

Trois sections empilées :

1. **Hero** (`section.hero`) : kicker meta (`Carnet · {{posts.length}} billets · depuis novembre 2024`),
   h1 sur une seule ligne avec `<em>études de genre</em>` puis « et en relations internationales. »,
   lede, et 4 stats (analyses, notes, fiches, pôles) calculées depuis Ghost
   (helper `{{#get "posts" filter="tag:..."}}`).
2. **Filtres** (`section.filters`) : barre Inter 13 px, deux groupes
   (Type / Pôle) en chips + compteur à droite. **Filtrage côté client** en
   JS progressif : data-attributs sur chaque item, `data-type` et
   `data-pole`. Avec JS désactivé, la barre reste visible mais inerte et la
   liste complète est rendue.
3. **Flux** : grille `120px 1fr 200px`, gap 48 px. Colonne gauche = numéro
   `n° 042` + date sur deux lignes + temps de lecture. Colonne centre =
   kicker + titre + chapô (max 580 px). Colonne droite = « Lire → » en
   accent + tags `#mono`. Hover : titre passe en accent.

Pied de flux : bouton « Voir toutes les archives » qui pointe vers
`/archives/`.

### 3. `post.hbs` — page article

Au-dessus du body : barre de progression sticky `top: 0; height: 2px`, fill
en accent, calculée en JS au scroll.

Structure du body :

1. Crumbs `Carnet / {pôle} / n° 042` (Inter 11 px uppercase muted).
2. Kicker `{type} · {pôle}`.
3. h1 du billet (52 px, peut contenir `<em>`).
4. Deck (chapô) 22 px muted.
5. **Meta-strip** : grille 4 colonnes encadrée par filets `--b-rule`,
   contenant : Publié, Lecture (≈ X min · Y mots), Pôle, ID
   (`carnet:2026-042`, en JetBrains Mono).
6. Corps article : un seul flux de paragraphes en Source Serif 4 19 px /
   1.7, **justifié** avec `hyphens: auto`. **Lettrine** sur la première
   lettre du premier paragraphe (`float: left`, 90 px, line-height 0.82).
7. Notes : implémenter en **classiques** (en pied), id `#fnN`, retour
   cliquable. Le mode sidenotes du prototype n'est pas livré.
8. Bibliographie : `<ul class="biblio">` 14 px / 1.65, `#3b3f4d`.
9. Bloc « Pour citer cet article » : fond `#ece9e0`, padding 24/28,
   rayon 4 px, label uppercase accent, corps 15 px, URL en mono 12 px,
   actions « Copier · BibTeX · RIS · Zotero » en accent 12 px Inter.
10. Bloc « Dans le même pôle » : grille 2 colonnes, items séparés par
    filets, date muted + titre 17 px / 600.

**Sommaire flottant (TOC)** : `position: fixed; left: 24px; top: 140px;
width: 200px`, masqué en dessous de 1300 px de viewport. Liens vers
sections (id sur les `<h2>`), item actif souligné par border-left accent
2 px. À implémenter en JS progressif (IntersectionObserver, ou comme dans
le prototype : on scroll, premier titre dont `top < 200`).

### 4. `archives.hbs` — page Archives

- Hero compact (h1 « Tous les billets, par année. » + lede).
- Pour chaque année (groupé via `{{#get "posts" limit="all"}}` et regroupement
  côté template) : titre 48 px + compteur en mono, puis lignes
  `120px 100px 1fr 160px` (date ISO, type uppercase accent, titre,
  pôle aligné à droite).

### 5. `tag.hbs` — page Pôle thématique

Deux variantes :

- **Vue d'ensemble** (route `/pole/`) : hero + grille 2 colonnes des cinq
  pôles, chaque carte = `#slug` en mono accent, nom du pôle 24 px, compteur
  à droite.
- **Pôle individuel** (route Ghost `/tag/:slug/`) : hero spécifique au pôle
  (kicker `Pôle · #slug`, h1 du pôle, baseline éditoriale, compteur + lien
  retour vers la vue d'ensemble), puis le même flux d'items que l'accueil
  filtré sur ce pôle.

Pôles à câbler comme tags Ghost (slugs identiques) :

- `genre-geopolitique` — Genre & géopolitique
- `lgbtqi-international` — LGBTQI+ & international
- `humanitaire-genre` — Humanitaire & genre
- `migrations-exil` — Migrations & exil
- `conflits-minorites` — Conflits & minorités

Trois pôles secondaires pour les notes de lecture : `theorie-feministe`,
`queer-theory`, `postcolonial`.

### 6. `page-about.hbs` — page « À propos »

Contenu structuré, pas un long bloc :

- Kicker `À propos`, h1 « Alice **Aussel Delamaide** », lede et deux
  paragraphes de bio.
- Sections successives, chacune introduite par `h2.sec` (Inter 12 px
  uppercase) :
  - **Terrains** : grille `160px 240px 1fr` (période · pays · note).
  - **Recherche** : même grille (période · institution · note).
  - **Publications** : grille à 2 colonnes (période · titre + descriptif).
  - **Colophon** : un paragraphe technique (Ghost dockerisé, Bunny Fonts,
    pas de pisteur, code ouvert, CC BY-NC-SA 4.0).

---

## Comportements interactifs (JS progressif)

Tout doit fonctionner sans JS — le JS améliore uniquement.

1. **Filtres d'accueil** : chips Type & Pôle qui togglent une classe
   `is-hidden` sur les items hors filtre. Persister la sélection en URL hash
   (`#type=Analyses&pole=Genre…`) pour que le partage fonctionne.
2. **TOC actif** : highlight de l'ancre courante au scroll
   (IntersectionObserver), scroll smooth au clic.
3. **Indicateur de progression** : barre sticky 2 px qui suit
   `scrollTop / (scrollHeight - clientHeight)`.
4. **Notes** : numérotation auto (`<sup><a href="#fnN">N</a></sup>` →
   ancres `<li id="fnN">` avec retour `↩`).
5. **« Copier »** dans le bloc citation : `navigator.clipboard.writeText`,
   feedback visuel léger (texte → « Copié »).

Aucune animation au-delà de transitions de couleur 120 ms sur les liens, et
du `fadeIn 250 ms` à l'entrée de page (peut être supprimé en prod si jugé
superflu).

---

## Accessibilité & sobriété

- Contraste vérifié : `--b-ink` sur `--b-bg` ≈ 14:1, `--b-muted` sur
  `--b-bg` ≈ 5.4:1, `--b-accent` sur `--b-bg` ≈ 7.3:1 → AA partout.
- Tailles minimum 16 px pour le corps des articles, 13 px pour la nav.
- Tous les liens externes : `rel="noopener"`, sans `target="_blank"` par
  défaut.
- Aucun pisteur. Pas de Google Fonts. Pas de scripts tiers. Pas de pop-up
  cookies (rien à consentir).
- Sitemap, robots.txt, RSS et JSON Feed exposés via Ghost natif.

---

## Fichiers fournis dans ce bundle

- `Carnet B.html` — coquille HTML qui charge React + Babel et le JSX. **À
  ouvrir dans un navigateur pour voir le rendu.**
- `carnet-b-app.jsx` — application React du prototype : router à hash,
  données fictives (`POSTS`, `POLES`), composants `Header`, `Footer`,
  `Home`, `Article`, `Archives`, `PolePage`, `About`. **Source de vérité
  pour la structure DOM, les classes CSS et les espacements.**
- `tweaks-panel.jsx` — panneau de tweaks utilisé en exploration. **Ne pas
  porter en production.**

Le CSS est inline dans `<style>` au sein de `Carnet B.html` — c'est la
référence pour les variables, la grille et les règles précises.

---

## Plan de portage suggéré

1. Initialiser un thème Ghost vierge (`ghost-cli init` ou fork de Casper).
2. Mettre `package.json` avec engine Ghost ≥ 5.x, créer
   `assets/css/carnet.css` avec les tokens et règles extraites du
   prototype.
3. Auto-héberger les WOFF2 (Bunny Fonts → téléchargement + `@font-face`
   locales avec `font-display: swap`).
4. Implémenter `default.hbs` (header + footer), puis `index.hbs`,
   `post.hbs`, `archives.hbs`, `tag.hbs`, `page-about.hbs`.
5. Câbler les 5 tags pôles dans l'admin Ghost et un custom post type
   (champ « Type » : Analyse / Note de lecture / Fiche) via tags
   internes (`#analyse`, `#note`, `#fiche`).
6. Ajouter les 3 scripts progressifs (`assets/js/carnet.js`) : filtres,
   TOC, progression. Aucune dépendance.
7. Vérifier le rendu sans JS (Lighthouse, mode reader).
8. Conteneuriser : `Dockerfile` qui mount le thème, `docker-compose.yml`
   avec Ghost + MySQL + Caddy/Nginx en reverse-proxy TLS.
