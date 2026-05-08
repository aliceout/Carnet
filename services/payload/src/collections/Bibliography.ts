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
          name: 'author',
          type: 'text',
          required: true,
          label: 'Auteur·ice(s)',
          admin: {
            description:
              'Format Chicago : « Nom, Prénom » ; plusieurs auteurs séparés par « ; ».',
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
