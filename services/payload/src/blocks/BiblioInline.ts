import type { Block } from 'payload';

/**
 * Référence bibliographique inline — pointeur vers une entrée de la
 * collection `bibliography`.
 *
 * Au rendu, devient un lien interne typé « (Auteur, année) » qui ancre
 * vers la section Bibliographie en pied d'article (id = `#bib-<slug>`).
 *
 * Le format affiché peut être surchargé par les champs `prefix` /
 * `suffix` (ex : « cf. » avant, « , p. 47 » après). C'est utile pour
 * une citation type Chicago author-date.
 */
export const BiblioInline: Block = {
  slug: 'biblio_inline',
  labels: { singular: 'Référence biblio (inline)', plural: 'Références biblio (inline)' },
  fields: [
    {
      name: 'entry',
      type: 'relationship',
      relationTo: 'bibliography',
      required: true,
      label: 'Entrée bibliographique',
    },
    {
      name: 'prefix',
      type: 'text',
      required: false,
      label: 'Préfixe',
      admin: { description: 'Ex : « cf. », « voir », « comparer ».' },
    },
    {
      name: 'suffix',
      type: 'text',
      required: false,
      label: 'Suffixe',
      admin: { description: 'Ex : « , p. 47 », « , chap. 3 ».' },
    },
  ],
};
