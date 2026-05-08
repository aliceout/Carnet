import type { CollectionConfig } from 'payload';

import { authenticated } from '../access/authenticated';

/**
 * Bibliographie — entrées académiques réutilisables entre billets.
 *
 * Schéma inspiré de BibTeX (auteur, année, titre, type, éditeur, lieu,
 * pages, URL/DOI). Suffisant pour générer une notice Chicago author-date
 * inline (« Farris, 2017, p. 47 ») et pour exporter en BibTeX/RIS plus
 * tard (cf issue v2 export téléchargeable).
 *
 * Le slug est dérivé de auteur + année (ex : `farris-2017`) et sert
 * d'ancre dans la section Bibliographie du billet (id = `#bib-farris-2017`).
 */
export const Bibliography: CollectionConfig = {
  slug: 'bibliography',
  labels: { singular: 'Référence', plural: 'Bibliographie' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'displayLabel',
    defaultColumns: ['displayLabel', 'authorLabel', 'year', 'type', 'updatedAt'],
    listSearchableFields: ['authors.lastName', 'authors.firstName', 'title', 'slug'],
    components: {
      views: {
        // Vue d'édition custom — remplace entièrement le rendu natif
        // Payload (form stacked + champs UI fantômes pour sections /
        // preview / used-in) par le layout du handoff (CarnetTopbar
        // + h1 hero + sections Identification/Publication/Notes +
        // aperçu Chicago author-date live + liste des billets liés).
        edit: {
          root: {
            Component: '@/components/admin/BibliographyEditView#default',
          },
        },
        list: {
          Component: '@/components/admin/BibliographyListView#default',
        },
      },
    },
  },
  // Schéma plat — la vue custom (BibliographyEditView) regroupe les
  // champs en sections « Identification / Publication / Notes » et
  // rend l'aperçu + used-in. Pas besoin de UI fields fantômes.
  fields: [
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          "Clé courte, ex : 'farris-2017'. Sert d'ancre `#bib-...` côté article.",
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'book',
          options: [
            { label: 'Livre', value: 'book' },
            { label: 'Chapitre', value: 'chapter' },
            { label: 'Article', value: 'article' },
            { label: 'Document de travail', value: 'paper' },
            { label: 'Web', value: 'web' },
            { label: 'Autre', value: 'other' },
          ],
        },
        {
          name: 'year',
          type: 'number',
          required: true,
          label: 'Année',
          min: 1700,
          max: 3000,
        },
      ],
    },
    {
      // Auteur·ice·s normalisé·e·s : un sous-doc par personne (firstName,
      // lastName, rôle). C'est la convention BibTeX/CSL/Zotero, et la
      // seule façon de générer du Chicago propre (1er auteur en `Nom,
      // Prénom`, suivants en `Prénom Nom`). L'auteur principal pour la
      // citation courte est `authors[0]` — pas de flag séparé, juste l'ordre.
      name: 'authors',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'Auteur·ice·s',
      admin: {
        description:
          'Une ligne par personne (1er = auteur·ice principal·e, utilisé pour le tri et la citation courte). `firstName` peut rester vide pour les auteurs corporatifs (UNESCO, Conseil de l’Europe…).',
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'lastName',
              type: 'text',
              required: true,
              label: 'Nom',
            },
            {
              name: 'firstName',
              type: 'text',
              required: false,
              label: 'Prénom',
            },
            {
              name: 'role',
              type: 'select',
              required: true,
              defaultValue: 'author',
              label: 'Rôle',
              options: [
                { label: 'Auteur·ice', value: 'author' },
                { label: 'Direction (dir.)', value: 'editor' },
                { label: 'Traduction (trad.)', value: 'translator' },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
    },

    {
      type: 'row',
      fields: [
        {
          name: 'publisher',
          type: 'text',
          required: false,
          label: 'Éditeur / revue',
          admin: { description: 'Pour les livres : éditeur. Pour les articles : revue.' },
        },
        {
          name: 'place',
          type: 'text',
          required: false,
          label: 'Lieu',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'volume',
          type: 'text',
          required: false,
          label: 'Volume / numéro',
        },
        {
          name: 'journal',
          type: 'text',
          required: false,
          label: 'Collection',
          admin: { description: 'Optionnel — collection éditoriale, série, etc.' },
        },
        {
          name: 'pages',
          type: 'text',
          required: false,
          label: 'Pages',
          admin: { description: 'Ex : « 43-82 », « chap. 3 ».' },
        },
      ],
    },
    {
      name: 'url',
      type: 'text',
      required: false,
      label: 'URL',
    },
    {
      name: 'doi',
      type: 'text',
      required: false,
      label: 'DOI',
    },

    {
      name: 'annotation',
      type: 'textarea',
      required: false,
      label: 'Annotation personnelle',
      admin: {
        description:
          "Optionnel — note de lecture, raison de l'inclusion, mémo de contexte. Non publié.",
      },
    },

    {
      // Label compact des auteurs pour la colonne « Auteurs » de la
      // liste admin et la composition du `displayLabel`. Calculé depuis
      // `authors[]` (priorité) ou `author` legacy en fallback. Persisté
      // (text classique) pour permettre tri/recherche dans la liste.
      name: 'authorLabel',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data }) => buildAuthorLabel(data),
        ],
      },
    },
    {
      // Champ virtuel UI-only : composé pour useAsTitle (« Auteurs, année — Titre »).
      name: 'displayLabel',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const author = buildAuthorLabel(data);
            const year = data?.year ?? '';
            const title = data?.title ?? '';
            return `${author}${year ? ` (${year})` : ''}${title ? ` — ${title}` : ''}`;
          },
        ],
      },
    },
  ],
};

/**
 * Compose le label compact des auteurs (« Butler », « Butler & Spivak »,
 * « Butler et al. ») depuis `authors[]`. Utilisé pour la colonne admin
 * et la composition du `displayLabel`. Le rendu Chicago complet vit
 * dans `lib/format-authors` côté admin et frontend.
 */
function buildAuthorLabel(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const obj = data as { authors?: Array<{ lastName?: string }> };
  const list = Array.isArray(obj.authors) ? obj.authors : [];
  const names = list
    .map((a) => (a?.lastName ?? '').trim())
    .filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} et al.`;
}
