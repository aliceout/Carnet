import type { CollectionConfig } from 'payload'

import { authenticated } from '../access/authenticated'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Média', plural: 'Médias' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    components: {
      views: {
        // Vue d'édition custom — drop-zone fichier + champ alt + meta
        // (mime, taille, dims) + aperçu image. Cf BibliographyEditView
        // / ThemeEditView.
        edit: {
          root: {
            Component: '@/components/admin/MediaEditView#default',
          },
        },
        list: {
          Component: '@/components/admin/MediaListView#default',
        },
      },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: false,
      label: 'Titre',
      admin: {
        description:
          'Optionnel. Si vide à la sauvegarde, le texte alternatif est utilisé.',
      },
      hooks: {
        // Fallback : si l'autrice laisse le titre vide, on retombe sur
        // alt à la sauvegarde. Évite d'avoir à saisir deux fois la même
        // chose dans les cas simples (légende = description).
        beforeChange: [
          ({ value, data }) => {
            const v = typeof value === 'string' ? value.trim() : '';
            if (v) return value;
            const alt = typeof data?.alt === 'string' ? data.alt.trim() : '';
            return alt || value;
          },
        ],
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: true,
}
