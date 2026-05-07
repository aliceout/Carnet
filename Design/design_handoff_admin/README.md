# Handoff — Carnet, admin Payload v3

## Overview

Interface admin pour le carnet de recherche d'Alice Aussel Delamaide. Cette interface est l'espace d'écriture quotidien : édition de billets longs (analyses académiques), gestion d'une bibliographie réutilisable, taxonomie par pôles thématiques. Le frontend public existe déjà (cf. `Carnet B.html` joint) ; **l'admin doit s'inscrire dans la même famille visuelle**, pas dans un look « panel SaaS générique ».

## About the Design Files

Les fichiers de ce bundle sont des **références de design écrites en HTML** — des prototypes qui montrent l'apparence et le comportement attendus, **pas du code à copier-coller en production**. Votre travail consiste à recréer ces designs **dans Payload v3** en utilisant ses points d'extension natifs (`admin.components`, custom views, custom field components, custom routes).

- `carnet-admin.html` — prototype des 6 écrans admin (objet principal de ce handoff)
- `Carnet B.html` + `carnet-b-app.jsx` — frontend public, joints **pour référence visuelle uniquement** (cohérence des tokens)

## Fidelity

**Hi-fi.** Les couleurs, la typographie, les espacements, les filets et les états interactifs sont définitifs. Reproduisez à l'identique.

## Stack cible

- **Payload v3.x** (Next.js App Router intégré)
- Personnalisation via `admin.components` dans `payload.config.ts`, custom CSS via `admin.css`
- Polices auto-hébergées (pas de Google Fonts)

## Tokens de design (à mettre dans `admin.css` en `:root`)

```css
:root {
  --b-ink:    #1a1d28;   /* texte principal, titres, bouton primaire */
  --b-bg:     #fdfcf8;   /* fond global de l'app */
  --b-paper:  #fbfaf6;   /* fond des cartes et champs (crème, pas blanc pur) */
  --b-rule:   #d6d3c8;   /* filets, bordures, séparateurs (1px) */
  --b-muted:  #5e6373;   /* méta, labels secondaires, placeholders */
  --b-accent: #1a1d28;   /* actions primaires, focus, états actifs (NOIR pour l'admin) */
  --b-accent-tint: rgba(26,29,40,.06);
}
```

> **Note importante sur l'accent** : sur le frontend public, l'accent est violet `#5a3a7a`. **Pour l'admin, l'utilisatrice a choisi un accent neutre noir `#1a1d28`** afin que l'interface d'écriture soit plus sobre et que l'accent du frontend reste un signal éditorial fort. Ne pas reprendre le violet ici.

## Typographies

Trois familles, chacune avec un rôle strict :

| Famille | Usage | Poids utiles |
|---|---|---|
| **Source Serif 4** | Titres éditoriaux uniquement (titre du billet en cours d'édition, dashboard h1, login brand) | 500, 600 |
| **Inter** | Toute l'UI : nav, labels, boutons, listes, formulaires, méta | 400, 500, 600 |
| **JetBrains Mono** | IDs, slugs, dates ISO (`2026-04-14`), numéros de billet (`n° 042`), clés biblio (`saiz-2014`) | 400, 500 |

Auto-héberger en WOFF2 dans `public/fonts/`. Charger via `@font-face` dans `admin.css`. **Aucun appel à un CDN externe.**

## Esthétique générale

- Filets fins **1px** partout (`var(--b-rule)`)
- **Pas d'ombres** sauf sur les pop-ups (slash menu, toast, panneau Tweaks) — ombre douce `0 4px 16px rgba(26,29,40,.12)`
- **Rayons : 0** partout sauf sur les blocs « card » → 4px
- Aucune couleur en dehors de la palette ci-dessus
- Aucune icône décorative, aucun emoji, aucun gradient
- Densité : Inter 13px en taille de base, line-height 1.5

## Modèle de données Payload

### Collections

#### `posts` (les billets)

| Champ | Type | Notes |
|---|---|---|
| `numero` | text | n° séquentiel (042). Auto si possible. |
| `titre` | text | utilisé comme `useAsTitle` |
| `slug` | text | format `kebab-case`, indexé, unique |
| `type` | select | `analyse` \| `note-de-lecture` \| `fiche` |
| `pole` | relationship → `poles` | un seul pôle par billet |
| `lede` | textarea | chapô, ~280 caractères |
| `body` | richText (Lexical) | avec blocks custom (voir plus bas) |
| `footnotes` | array | objets `{ n: number, body: richText }` |
| `biblio` | relationship → `bibliography` | hasMany |
| `published_at` | date | |
| `updated_at` | date | auto |
| `reading_time` | text | calculé hook `beforeChange` |
| `id_carnet` | text | format `carnet:YYYY-NNN`, calculé |

Activer **drafts + published** natifs (`versions: { drafts: true }`).

#### `poles`

| Champ | Type |
|---|---|
| `nom` | text (`useAsTitle`) |
| `slug` | text |
| `description` | textarea |

5 pôles seedés : `genre-geopolitique`, `lgbtqi-international`, `humanitaire-genre`, `migrations-exil`, `conflits-minorites`.

#### `bibliography`

| Champ | Type | Notes |
|---|---|---|
| `cle` | text | `useAsTitle`, format `auteur-annee` |
| `type` | select | `livre` \| `article` \| `chapitre` \| `ressource` |
| `auteur` | text | `Nom, Prénom` |
| `annee` | text | |
| `titre` | text | |
| `editeur` | text | |
| `lieu` | text | |
| `volume`, `numero`, `pages` | text | |
| `doi_url` | text | |
| `annotation` | textarea | annotation personnelle |

#### `about` (global, single)

`bio` (richText), `terrains` (array), `recherche` (array), `publications` (array), `colophon` (richText).

### Blocks Lexical custom (à brancher dans le champ `body`)

1. **`footnote`** — note de bas de page numérotée
2. **`citation_bloc`** — citation longue (filet gauche accent)
3. **`biblio_inline`** — référence par clé (autocomplete sur `bibliography.cle`)
4. **`figure`** — upload image + légende

Ces blocks doivent apparaître dans le **slash menu Lexical** (voir maquette de l'écran d'édition).

## Écrans à implémenter

### 1. Document view — édition d'un billet *(priorité 1)*

**Route Payload :** `/admin/collections/posts/:id` (vue native, à customiser)

**Layout :**
- Header en haut (56px) : breadcrumb (`Carnet / Billets / n° 042`), chip de statut, actions à droite (Aperçu ↗, Sauvegarder ⌘S, **Publier les modifications** en bouton accent)
- Grid 2 colonnes : zone éditeur (centre, fluide) + sidebar méta (300px à droite, fixe)
- Sous 1180px : la sidebar méta passe **sous** l'éditeur

**Zone éditeur :**
- Cadre crème `var(--b-paper)`, bordure 1px, rayon 4px, **pleine largeur** de la colonne centrale, padding `32px 40px 28px`
- En haut, méta-ligne mono : `Billet n° 042 · carnet:2026-042`
- Champ titre : Source Serif 4 600 36px, transparent, sans bordure visible
- Champ chapô (lede) : Source Serif 4 400 18px italique muted
- Filet de séparation
- Corps Lexical : Source Serif 4 17px / 1.65, paragraphes avec espacement, h2 24px 600
- Notes inline rendues comme `[1]` en accent, cliquables vers la liste de footnotes
- Référence biblio inline rendue comme tag inline `@biblio: saiz-2014` sur fond accent-tint

**Slash menu Lexical** (apparaît au `/`) — voir maquette pour le rendu exact :
- Header `Blocs Carnet` (lbl mono uppercase muted) puis options :
  - `fn` → Note de bas de page (raccourci F)
  - `«»` → Citation longue (Q)
  - `@` → Bibliographie inline (B)
  - `▢` → Figure (I)
- Header `Mise en forme` puis :
  - `H2` → Titre de section (⇧⌘1)
  - `H3` → Sous-titre (⇧⌘2)

Chaque option : icône mono 24px à gauche en accent, label + description muted, raccourci mono à droite.

**Bloc footnotes** sous l'éditeur — cadre crème séparé, header `Notes de bas de page (4)` + bouton `+ Ajouter une note` à droite. Chaque ligne : numéro mono `[1]` en accent, corps Source Serif 4 14px éditable, croix de suppression à droite.

**Sidebar méta (300px) :**
- Section *Métadonnées* : numéro, slug (avec aperçu URL en help text), grid 2 cols type + pôle
- Section *Calendrier* : grid 2 cols publication + mise à jour
- Section *Bibliographie liée* : liste compacte des refs liées + bouton dashed `+ Ajouter une référence…`
- Section *Auto-calculé* : ID Carnet et reading time en boîtes `border:1px dashed`, fond `var(--b-bg)`, mono

**Toast feedback** : bottom-right, fond ink, texte bg, check vert `#7ad19a` mono, contenu « Brouillon sauvegardé · il y a 2 min ».

### 2. Collection list view — Liste des billets

**Route Payload :** `/admin/collections/posts`

**Toolbar** (sous le header) : input recherche avec icône `⌥` à gauche, puis 4 boutons filtre (Type / Pôle / Statut / Tri) au format `Type : tous ▾`. Bouton primaire « Nouveau billet » (`⌘ N`) dans le header en haut à droite.

**Tableau** — bordure 1px, pleine largeur, fond crème :
- Ligne d'en-tête : fond `var(--b-bg)`, labels mono uppercase 11px muted
- Colonnes (grid) : `60px 110px 130px 180px 1fr 100px 32px` → N° / Date ISO / Type / Pôle / Titre / Statut (chip) / `⋯`
- Hover : fond `var(--b-accent-tint)`
- Click ligne → ouvre la vue document

**Chips de statut** : `Brouillon` (point ambre `#b8842a`), `Publié` (point + bordure accent), `Planifié` (point bleu `#3a6a8a`).

**Pagination** en bas : "Affichage 1–47 sur 47 · 25 par page" + boutons numérotés.

### 3. Dashboard — Page d'accueil admin

**Route :** `/admin` (custom view via `admin.components.views.Dashboard`)

- Kicker `Carnet · admin` (uppercase letter-spaced accent)
- H1 Source Serif 4 48px : « Bonjour *Alice*. » (em sur prénom, weight 500)
- Lede muted ~600px : compteur de brouillons et planifiés, stats hebdo
- Grille de 4 stats avec filets (1×4) : `28 analyses publiées` / `17 notes de lecture` / `9 fiches thématiques` / `5 pôles`
- Grille 2 cols : *Brouillons en cours* (3 dernières lignes) / *Planifié à publier*
- Bloc *Raccourcis* : grid 3 cols, chaque carte = label mono + titre Source Serif. Items : Nouveau billet (`⌘N`), Nouvelle note de lecture (`#note`), Nouvelle fiche thématique (`#fiche`)

### 4. Login — Écran de connexion

**Route Payload :** `/admin/login` (custom via `admin.components.beforeLogin` ou view complète)

- Plein écran centré, fond `var(--b-bg)`
- Carte 380px : marque `Carnet.` Source Serif 64px (point en accent), sous-titre muted `Espace d'écriture — carnet.aliceosdel.org`
- Champs email + mot de passe (labels mono uppercase)
- Bouton accent pleine largeur « Entrer dans l'admin »
- Footer fixe en bas : `carnet.aliceosdel.org` à gauche, version Payload mono à droite

### 5. Sidebar / navigation latérale

**Implémentation :** `admin.components.Nav` (custom) ou override CSS de la nav native.

- Largeur **220px fixe**, fond `var(--b-bg)`, filet droit 1px, sticky pleine hauteur
- Marque `Carnet.` Source Serif 22px en haut (padding 20/24)
- Sections (label mono uppercase 10.5px letter-spaced muted, padding 14/24) :
  - **Contenu** : Billets (47) · Pôles (5) · Bibliographie (128) · Médias (24)
  - **Pages** : À propos · Colophon
  - **Réglages** : Utilisateurs · Routing · Site
- Items : Inter 13px, padding 7/24, count à droite en mono 11px muted
- Hover : fond `var(--b-accent-tint)`
- Actif : `border-left:2px solid var(--b-accent)` + même fond accent-tint + `font-weight:600`
- **Pas d'icônes** — texte typographique uniquement
- Footer : avatar carré 26px (initiale en Source Serif sur fond accent), nom + rôle muted

### 6. Bibliography edit view

**Route Payload :** `/admin/collections/bibliography/:id`

- Header avec breadcrumb `Carnet / Bibliographie / saiz-2014` (slug en mono)
- Cadre crème pleine largeur, padding `32px 40px`
- Titre Source Serif 30px « Référence bibliographique »
- Sous-titre mono `clé : saiz-2014`
- Sections groupées avec headers mono uppercase + filet bottom :
  - **Identification** : grid 3 cols (Type / Auteur(e)s / Année), puis Titre pleine largeur
  - **Publication** : grid 2 cols (Éditeur/Revue / Lieu), grid 3 cols (Volume / Numéro / Pages), puis DOI/URL pleine largeur
  - **Notes** : textarea annotation personnelle
- **Aperçu live** en bas : bloc fond `var(--b-bg)`, filet gauche accent 2px, label mono uppercase « Aperçu (style biblio) », rendu Source Serif de la référence formatée
- Ligne *Utilisée dans 3 billets : n° 042, n° 041, n° 040* (liens accent)

## États interactifs

### Boutons

```
.btn         — bordure 1px rule, fond paper, hover bordure ink
.btn.primary — fond ink, texte bg, hover #000
.btn.accent  — fond accent (noir admin), texte blanc
.btn.ghost   — fond transparent
.btn .kbd    — raccourci mono 10.5px muted, marge gauche 8px
```

### Champs

- Background `var(--b-paper)`, bordure 1px rule
- Focus : `border-color:var(--b-accent)` (pas de glow)
- Boîtes auto-calculées : `border:1px dashed`, fond `var(--b-bg)`, mono muted

### Drafts vs Published (Payload natif)

Afficher **les deux états visuellement distincts** dans le header du document (chip), dans la liste (chip), et désactiver « Publier les modifications » quand il n'y a rien à publier. Le bouton « Sauvegarder » ne touche que le draft.

## Comportements

- Auto-save du brouillon toutes les 30s, feedback toast bottom-right
- Cmd+S → sauvegarde (intercepter)
- Cmd+N depuis n'importe où → nouveau billet
- Cmd+K → palette de commande (pas dans le proto, mais à prévoir)
- Slash menu : `/` ouvre le menu Lexical, ↑↓ pour naviguer, Enter pour insérer, Esc pour fermer
- Liste billets : click ligne → ouvre document. Filtres persistés dans l'URL (`?type=analyse&pole=…`)

## Responsive

- ≥1180px : layout document à 2 colonnes (éditeur + méta)
- 900–1180px : méta passe sous l'éditeur (filet top au lieu de filet gauche)
- <900px : sidebar nav masquée (à remplacer plus tard par un drawer)

## Assets

- Polices Source Serif 4, Inter, JetBrains Mono — télécharger depuis [Bunny Fonts](https://fonts.bunny.net) en WOFF2, poser dans `public/fonts/`
- Aucun autre asset

## Tests à passer

1. Tous les écrans rendent identiquement à `carnet-admin.html` à largeur 1280px
2. Lighthouse > 95 sur l'admin (perf + a11y)
3. Cohérence avec le frontend public : ouvrir `Carnet B.html` côte à côte, mêmes filets, même papier, même typographie de titre
4. Aucun appel réseau vers Google Fonts ou autre CDN externe

## Files

- `carnet-admin.html` — prototype des 6 écrans (router à hash : `#/login`, `#/dashboard`, `#/posts`, `#/posts/042`, `#/biblio`, `#/biblio/saiz-2014`)
- `Carnet B.html` + `carnet-b-app.jsx` — référence frontend (consulter pour cohérence visuelle uniquement)
