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
    defaultColumns: ['displayLabel', 'author', 'year', 'type', 'updatedAt'],
    listSearchableFields: ['author', 'title', 'slug'],
    components: {
      views: {
        list: {
          Component: '@/components/admin/BibliographyListView#default',
        },
      },
    },
  },
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
      name: 'author',
      type: 'text',
      required: true,
      label: 'Auteur·ice(s)',
      admin: {
        description:
          'Format Chicago : « Nom, Prénom » ; pour plusieurs auteurs, séparer par « ; ».',
      },
    },
    {
      name: 'year',
      type: 'number',
      required: true,
      label: 'Année',
      min: 1700,
      max: 3000,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
    },
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
      name: 'publisher',
      type: 'text',
      required: false,
      label: 'Éditeur',
    },
    {
      name: 'place',
      type: 'text',
      required: false,
      label: 'Lieu',
    },
    {
      name: 'pages',
      type: 'text',
      required: false,
      label: 'Pages',
      admin: { description: 'Ex : « 43-82 », « chap. 3 ».' },
    },
    {
      name: 'journal',
      type: 'text',
      required: false,
      label: 'Revue / collection',
      admin: { description: 'Pour articles, chapitres ou collections.' },
    },
    {
      name: 'volume',
      type: 'text',
      required: false,
      label: 'Volume / numéro',
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
      // Champ virtuel UI-only : composé pour useAsTitle (« Auteur, année — Titre »).
      name: 'displayLabel',
      type: 'text',
      admin: {
        hidden: true,
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            const author = data?.author ?? '';
            const year = data?.year ?? '';
            const title = data?.title ?? '';
            return `${author}${year ? ` (${year})` : ''}${title ? ` — ${title}` : ''}`;
          },
        ],
      },
    },
  ],
};
