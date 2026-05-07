import type { GlobalConfig } from 'payload';

/**
 * Réglages globaux du site — édités par l'autrice depuis l'admin.
 *
 * Stocke les éléments éditoriaux qui changent rarement mais qui ne sont
 * pas du contenu : baseline, copyright, liens sociaux, etc. Le footer
 * Astro lit ces valeurs au SSR.
 */
export const Site: GlobalConfig = {
  slug: 'site',
  label: 'Paramètres du site',
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    components: {
      // Header custom (crumbs « Carnet / Site (global) ») inséré
      // au-dessus de la barre d'actions native Payload.
      elements: {
        beforeDocumentControls: ['@/components/admin/SiteEditHeader#default'],
      },
    },
  },
  fields: [
    {
      name: 'baseline',
      type: 'textarea',
      required: false,
      label: 'Baseline',
      defaultValue:
        "Carnet de recherche d'Alice Aussel Delamaide. Genre, géopolitique, droits LGBTQI+, humanitaire, migrations. Auto-hébergé. Sans pisteur.",
      admin: { description: 'Affichée dans le footer (col 1).' },
    },
    {
      name: 'copyrightLine',
      type: 'text',
      required: false,
      label: 'Ligne copyright',
      defaultValue: 'carnet.aliceosdel.org · CC BY-NC-SA 4.0',
      admin: { description: 'Footer (col 1, sous la baseline, en mono).' },
    },
    {
      name: 'social',
      type: 'group',
      label: 'Réseaux sociaux',
      fields: [
        {
          name: 'mastodon',
          type: 'text',
          required: false,
          admin: { description: 'URL complète du profil Mastodon.' },
        },
        {
          name: 'bluesky',
          type: 'text',
          required: false,
          admin: { description: 'URL complète du profil Bluesky.' },
        },
        {
          name: 'orcid',
          type: 'text',
          required: false,
          admin: { description: 'URL complète du profil ORCID.' },
        },
        {
          name: 'hal',
          type: 'text',
          required: false,
          admin: { description: 'URL complète de la page HAL.' },
        },
      ],
    },
    {
      name: 'navFooter',
      type: 'array',
      label: 'Liens du footer (col 2 « Naviguer »)',
      labels: { singular: 'Lien', plural: 'Liens' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        { name: 'external', type: 'checkbox', defaultValue: false },
      ],
      defaultValue: [
        { label: 'Tous les billets', href: '/', external: false },
        { label: 'Thèmes', href: '/themes/', external: false },
        { label: 'Archives', href: '/archives/', external: false },
      ],
    },
  ],
};
