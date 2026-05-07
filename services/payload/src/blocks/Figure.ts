import type { Block } from 'payload';

import { alignField } from './_shared';

/**
 * Image avec légende, crédit et alt obligatoire.
 *
 * Ref : pas de variante visuelle dans le handoff initial — on s'appuie
 * sur l'élément `<figure>` natif. L'alignement est paramétrable
 * (gauche-corps, centré, pleine largeur 920 px) pour les billets longs.
 */
export const Figure: Block = {
  slug: 'figure',
  labels: { singular: 'Figure', plural: 'Figures' },
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'legende',
      type: 'textarea',
      required: false,
      label: 'Légende',
    },
    {
      name: 'credit',
      type: 'text',
      required: false,
      label: 'Crédit / source',
      admin: {
        description:
          'Ex : « Photo : Alice Aussel Delamaide, Bangui, 2017 » ou « © UN Photo / Eskinder Debebe ».',
      },
    },
    alignField,
  ],
};
