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
      // Vue d'édition custom — remplace entièrement le rendu natif
      // Payload pour /cms/admin/globals/site par le formulaire éditorial
      // Carnet (header crumbs + sections + chips de statut). Même
      // pattern que les list views custom (Posts/Themes/...).
      views: {
        edit: {
          root: {
            Component: '@/components/admin/SiteEditView#default',
          },
        },
      },
    },
  },
  fields: [
    {
      name: 'branding',
      type: 'group',
      label: 'Branding',
      fields: [
        {
          name: 'accentColor',
          type: 'select',
          required: false,
          label: "Couleur d'accentuation",
          defaultValue: '#5a3a7a',
          options: [
            { label: 'Violet (par défaut)', value: '#5a3a7a' },
            { label: 'Rouge sourd', value: '#8a3a3a' },
            { label: 'Bleu encre', value: '#1f3a5a' },
            { label: 'Gris ardoise', value: '#3a3a3a' },
            { label: 'Vert forêt', value: '#2d5a3d' },
          ],
          admin: {
            description:
              "Teinte d'accent appliquée à tout le site (point de la marque, item nav actif, kickers, liens dans les billets, boutons actifs, etc.).",
          },
        },
        {
          name: 'backgroundColor',
          type: 'select',
          required: false,
          label: 'Couleur de fond',
          defaultValue: '#f6f5f1',
          options: [
            { label: 'Ivoire (par défaut)', value: '#f6f5f1' },
            { label: 'Presque-blanc', value: '#fdfcf8' },
            { label: 'Blanc pur', value: '#ffffff' },
            { label: 'Craie', value: '#f1efe8' },
            { label: 'Parchemin', value: '#eee9dd' },
            { label: 'Froid pâle', value: '#e9eaec' },
          ],
          admin: {
            description:
              'Teinte de fond du Carnet — appliquée au body et aux zones neutres (header, footer, fond des billets, fond admin).',
          },
        },
      ],
    },
    {
      name: 'home',
      type: 'group',
      label: "Page d'accueil",
      fields: [
        {
          name: 'heroTitle',
          type: 'textarea',
          required: false,
          label: 'Titre du hero',
          defaultValue:
            'Notes de recherche en *études de genre* et en relations internationales.',
          admin: {
            description:
              'H1 de la page d\'accueil. Entourer une portion de "*" pour la mettre en italique (ex. *études de genre*).',
          },
        },
        {
          name: 'heroLede',
          type: 'textarea',
          required: false,
          label: 'Texte de présentation (lede)',
          defaultValue:
            'Analyses longues, notes de lecture et fiches thématiques sur le genre, la géopolitique et les droits LGBTQI+ dans les rapports internationaux. Principalement en français.',
          admin: {
            description: "Paragraphe sous le titre de la page d'accueil.",
          },
        },
      ],
    },
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
