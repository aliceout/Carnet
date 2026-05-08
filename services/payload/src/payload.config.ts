import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import path from 'path';
import { buildConfig } from 'payload';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

import { Users } from './collections/Users';
import { Media } from './collections/Media';
import { Posts } from './collections/Posts';
import { Themes } from './collections/Themes';
import { Bibliography } from './collections/Bibliography';
import { Pages } from './collections/Pages';
import { Site } from './globals/Site';
import { authEndpoints } from './auth/endpoints';
import { buildEmailAdapter } from './auth/transport';
import { startCleanupJob } from './auth/cleanup';
import { bootstrapRootUser } from './auth/bootstrap';
import { startPendingCleanup } from './auth/pending-store';
import { startRateLimitCleanup } from './auth/rate-limit';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// On branche les endpoints d'auth (invitations, 2FA, profil) sur la
// collection users. Payload les expose alors sous /cms/api/users/<path>.
const baseEndpoints = Array.isArray(Users.endpoints) ? Users.endpoints : [];
const UsersWithEndpoints = {
  ...Users,
  endpoints: [...baseEndpoints, ...authEndpoints],
  admin: {
    ...Users.admin,
    components: {
      ...(Users.admin?.components ?? {}),
      beforeListTable: ['@/components/auth/InviteUserButton#default'],
    },
  },
};

export default buildConfig({
  // Admin sous /cms/admin via la file structure (src/app/cms/(payload)).
  // Routes Payload absolues — pas de basePath Next.js (ça casse les
  // chemins d'assets, cf payloadcms/payload#10534).
  routes: {
    admin: '/cms/admin',
    api: '/cms/api',
    graphQL: '/cms/graphql',
    graphQLPlayground: '/cms/graphql-playground',
  },
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname, 'app/cms/(payload)'),
      importMapFile: path.resolve(
        dirname,
        'app/cms/(payload)/admin/importMap.js',
      ),
    },
    components: {
      // Nav latérale custom — remplace la nav native (collections à plat)
      // par la structure éditoriale Contenu / Pages / Réglages avec
      // counts à droite. Cf Design/design_handoff_admin/README.md § 5.
      Nav: '@/components/admin/Nav#default',
      // Login overridé pour gérer le 2FA en deux étapes.
      views: {
        login: {
          Component: '@/components/auth/LoginView#default',
        },
        // Page d'acceptation d'invitation : /cms/admin/invitation/:token
        invitation: {
          Component: '@/components/auth/InvitationAcceptView#default',
          path: '/invitation/:token',
        },
        // Dashboard custom — remplace l'écran d'accueil natif Payload
        // par le hero éditorial du handoff (kicker + h1 + 4 stats +
        // brouillons + planifiés + raccourcis).
        dashboard: {
          Component: '@/components/admin/Dashboard#default',
        },
        // /cms/admin/account — vue Mon compte custom. Même pattern
        // que les list views custom : remplace entièrement le rendu
        // natif Payload, fetch via /cms/api/users/me, save via PATCH
        // /cms/api/users/[id], embed le panneau Sécurité existant
        // (2FA + trusted devices).
        account: {
          Component: '@/components/admin/AccountView#default',
        },
      },
      // Keepalive injecté en barre d'actions globale → tourne sur toutes
      // les pages de l'admin tant qu'un onglet est ouvert.
      actions: ['@/components/auth/SessionKeepalive#default'],
    },
  },
  collections: [
    Posts,
    Themes,
    Bibliography,
    Pages,
    UsersWithEndpoints,
    Media,
  ],
  globals: [Site],
  editor: lexicalEditor(),
  email: buildEmailAdapter(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  // Postgres via fields séparés (évite les problèmes d'URL-encoding
  // quand POSTGRES_PASSWORD a des caractères spéciaux).
  //
  // push: true force la synchro schéma → DB à chaque boot, en dev ET
  // en prod. Pas de migrations à générer/maintenir. Trade-off conscient
  // pour ce projet : data peu critique (contenus éditoriaux), schéma
  // sous code review (changements structurés via PR), single-user →
  // simplicité l'emporte sur l'historique formel des migrations.
  // Voir issue v2 « Adopter les migrations Postgres formelles ».
  db: postgresAdapter({
    pool: {
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      host: process.env.POSTGRES_HOST ?? 'localhost',
      port: Number.parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
      database: process.env.POSTGRES_DB,
    },
    push: true,
  }),
  serverURL: process.env.ADDRESS || 'http://localhost:3001',
  // CORS : restreint aux domaines connus. En dev on autorise les
  // ports locaux courants (Astro 4321, Payload 3001) ; en prod on
  // autorise uniquement le domaine du site.
  cors: [
    process.env.ADDRESS,
    'http://localhost:4321',
    'http://localhost:3001',
  ].filter((url): url is string => Boolean(url)),
  // CSRF : Payload utilise cette liste pour valider les requêtes
  // mutantes (POST/PATCH/DELETE) côté admin et auth.
  csrf: [
    process.env.ADDRESS,
    'http://localhost:4321',
    'http://localhost:3001',
  ].filter((url): url is string => Boolean(url)),
  sharp,
  plugins: [],
  onInit: async (payload) => {
    // Promotion idempotente du premier user historique en root (cas d'une
    // base existant avant l'ajout du système de rôles).
    await bootstrapRootUser(payload);
    // Démarre le job de cleanup et les nettoyages mémoire (rate limit,
    // pending logins). Idempotent : appel multiple sans effet.
    startCleanupJob(payload);
    startPendingCleanup();
    startRateLimitCleanup();
  },
});
