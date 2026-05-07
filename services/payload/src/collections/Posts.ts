import type { CollectionConfig } from 'payload';

import { authenticated } from '../access/authenticated';

/**
 * Collection principale du Carnet — un billet académique.
 *
 * Schéma figé par le handoff design :
 *  - numero          : entier unique, affiché en n° 042 (zero-pad 3)
 *  - title / slug    : standards
 *  - type            : analyse (long), note de lecture, fiche
 *  - themes          : taxonomie multivaluée (relation Themes)
 *  - publishedAt     : date de première publication
 *  - updatedAt       : géré par Payload (suivi natif)
 *  - lede            : chapô / deck (~22 px italique muted dans le proto)
 *  - body            : rich text Lexical avec blocks custom (Footnote,
 *                      CitationBloc, BiblioInline, Figure)
 *  - bibliography    : array de relations vers Bibliography
 *  - readingTime     : minutes (auto-calculé via hook beforeChange)
 *  - idCarnet        : `carnet:YYYY-NNN` (auto-dérivé de year + numero)
 *  - draft           : masque le billet en prod (idem 2mains)
 *
 * Ref design : design_handoff_carnet/Carnet B.html → Article component.
 */
export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Billet', plural: 'Billets' },
  access: {
    read: () => true,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['numero', 'title', 'type', 'publishedAt', 'draft', 'updatedAt'],
    listSearchableFields: ['title', 'slug', 'lede'],
  },
  fields: [
    {
      name: 'numero',
      type: 'number',
      required: true,
      unique: true,
      index: true,
      label: 'Numéro',
      min: 1,
      max: 9999,
      admin: {
        position: 'sidebar',
        description:
          'Numéro de série du carnet — affiché « n° 042 » côté lecteur. Manuel et stable.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Titre',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          "URL-safe, ex : 'homonationalisme-diplomatie'. Sert à la route /billets/<slug>/.",
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'analyse',
      options: [
        { label: 'Analyse', value: 'analyse' },
        { label: 'Note de lecture', value: 'note' },
        { label: 'Fiche thématique', value: 'fiche' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'themes',
      type: 'relationship',
      relationTo: 'themes',
      hasMany: true,
      required: false,
      label: 'Thèmes',
      admin: {
        description: 'Taxonomie multivaluée — un billet peut appartenir à plusieurs thèmes.',
      },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      label: 'Date de publication',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'd MMMM yyyy',
        },
      },
    },
    {
      name: 'lede',
      type: 'textarea',
      required: true,
      label: 'Chapô',
      admin: {
        description: '~2-3 phrases — affichées en deck sous le titre.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      required: true,
      label: "Corps de l'article",
      admin: {
        description:
          'Lexical — slash menu pour insérer des notes, citations longues, références biblio, figures.',
      },
    },
    {
      name: 'bibliography',
      type: 'relationship',
      relationTo: 'bibliography',
      hasMany: true,
      required: false,
      label: 'Bibliographie',
      admin: {
        description:
          'Références listées en pied du billet, dans l’ordre choisi ici. Cliquables depuis les biblio_inline du corps.',
      },
    },
    {
      name: 'readingTime',
      type: 'number',
      required: false,
      label: 'Temps de lecture (minutes)',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Calculé automatiquement depuis le corps au save.',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const body = siblingData?.body;
            const text = extractTextFromLexical(body);
            const words = text.trim().split(/\s+/).filter(Boolean).length;
            return Math.max(1, Math.ceil(words / 220));
          },
        ],
      },
    },
    {
      name: 'idCarnet',
      type: 'text',
      required: false,
      label: 'ID Carnet',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Identifiant stable, dérivé de l’année et du numéro (ex : carnet:2026-042).',
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const numero = siblingData?.numero;
            const publishedAt = siblingData?.publishedAt;
            if (typeof numero !== 'number' || !publishedAt) return undefined;
            const year =
              typeof publishedAt === 'string'
                ? new Date(publishedAt).getFullYear()
                : publishedAt instanceof Date
                ? publishedAt.getFullYear()
                : new Date(String(publishedAt)).getFullYear();
            if (!Number.isFinite(year)) return undefined;
            return `carnet:${year}-${String(numero).padStart(3, '0')}`;
          },
        ],
      },
    },
    {
      name: 'draft',
      type: 'checkbox',
      defaultValue: false,
      label: 'Brouillon (masqué en prod)',
      admin: { position: 'sidebar' },
    },
  ],
};

/**
 * Extrait grossier du texte d'un node Lexical (rich text Payload). Suffit
 * pour estimer le temps de lecture — on prend tous les `text` récursivement
 * et on ignore les blocks (footnote, citation, etc.) qui ne sont pas des
 * « lecture courante ».
 */
function extractTextFromLexical(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const obj = node as Record<string, unknown>;
  let out = '';
  if (typeof obj.text === 'string') out += obj.text + ' ';
  const root = (obj.root ?? obj) as Record<string, unknown>;
  const children = root.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      out += extractTextFromLexical(child);
    }
  }
  return out;
}
