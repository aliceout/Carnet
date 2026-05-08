import type { CollectionConfig, FieldHook } from 'payload';

import { canMutateRole, isAdminOrRoot, isSelfOrAdmin, userRole } from '../access/roles';
import { AUTH_CONFIG } from '../auth/config';

// Collection users — étendue pour supporter :
//  - rôles (root unique / admin / editor)
//  - workflow d'invitation par mail (token 7 jours, suppression auto si expiré)
//  - 2FA email par défaut, TOTP en option
//  - 8 backup codes
//  - sessions glissantes 48h (auth.tokenExpiration côté Payload)
//  - trusted devices 7 jours
//
// Tous les champs sensibles (hash de tokens, secret TOTP chiffré, codes
// backup hachés) sont :
//   - admin.hidden  → cachés dans l'UI Payload, on a notre propre vue
//   - access.read   → admin/root only (pas exposés via REST aux editor)
//   - access.update → false (mutés uniquement via les endpoints custom)
//
// Le compte root est protégé par hooks (cf bottom).

const lockRoleField: FieldHook = ({ value, originalDoc, req, operation }) => {
  // À la création (invitation) le rôle est donné par l'inviteur.
  if (operation === 'create') return value;
  // En update : seul le root peut modifier le rôle d'un admin.
  // Personne ne peut modifier le rôle du root (verrouillage hors collection).
  if (originalDoc?.role === 'root') return 'root';
  if (originalDoc?.role === 'admin' && userRole(req) !== 'root') {
    return originalDoc.role;
  }
  return value;
};

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilisateur', plural: 'Utilisateurs' },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'displayName', 'role', 'status', 'updatedAt'],
    listSearchableFields: ['email', 'displayName'],
    // Cache la collection users dans la nav latérale pour les editor.
    // Les access ci-dessous bloquent aussi l'API/URL directe, ceci est
    // juste pour ne pas leur montrer le lien.
    hidden: ({ user }) => {
      const role = (user as { role?: string } | null | undefined)?.role;
      return role !== 'admin' && role !== 'root';
    },
    components: {
      views: {
        list: {
          Component: '@/components/admin/UsersListView#default',
        },
      },
      // Header custom (crumbs Carnet / Mon compte ou Carnet /
      // Utilisateurs / [email]) au-dessus de la barre d'actions
      // native pour /cms/admin/account et /cms/admin/collections/
      // users/[id].
      edit: {
        beforeDocumentControls: ['@/components/admin/AccountEditHeader#default'],
      },
    },
  },
  auth: {
    // Sliding 48h : Payload prolonge le cookie à chaque requête authentifiée
    // (renvoyée via Set-Cookie) tant que tokenExpiration n'est pas atteint.
    // Cf. payload.config admin.cookies.
    tokenExpiration: AUTH_CONFIG.sessionInactiveHours * 60 * 60,
    // verify: false → on gère nous-mêmes la vérif via le workflow
    // d'invitation (le user choisit son mdp en cliquant sur le lien).
    verify: false,
    // useSessions: false → désactive le check Payload qui requiert que le
    // `sid` du JWT soit présent dans user.sessions[]. En 3.84 ce check
    // foire silencieusement dans certains contextes (req.user reste null
    // → cascade sur 401/403 partout). On gère nos propres sessions via
    // les trustedDevices et le sliding 48h.
    useSessions: false,
    // maxLoginAttempts + lockTime : protection brute force native Payload,
    // complémentaire au rate-limit applicatif.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 min
  },
  access: {
    // Read : autorisé à admin/root et à soi-même (filtre par id).
    // Quand req.user est null on autorise aussi : c'est le contexte de
    // l'auth JWT interne de Payload qui appelle findByID(users, id) pour
    // hydrater req.user — si on bloque ici, l'auth foire et req.user
    // reste null partout (cf bug rencontré en Phase 6).
    read: ({ req }) => {
      if (!req.user) return true;
      const role = userRole(req);
      if (role === 'admin' || role === 'root') return true;
      return { id: { equals: req.user.id } };
    },
    // Création directe interdite — passage obligatoire par l'endpoint
    // /users/invite (qui génère un token et envoie le mail).
    // Exception : le bootstrap du premier user (register-first-user)
    // reste ouvert, géré par Payload nativement.
    create: () => false,
    // Update : admin/root sur n'importe quel user, ou self sur soi-même.
    // Les editor ne peuvent éditer que leur propre profil (pour le 2FA, etc).
    update: ({ req, id }) => {
      const role = userRole(req);
      if (role === 'admin' || role === 'root') return true;
      // Comparaison en string : id côté access et req.user.id peuvent venir
      // sous des types différents (Postgres bigint vs number JS).
      if (req.user && id !== undefined && String(id) === String(req.user.id)) return true;
      return false;
    },
    // Delete : admin/root uniquement, jamais sur le root (hook).
    delete: isAdminOrRoot,
    // Pas de surcharge `admin:` — on laisse le défaut Payload (si la
    // collection du user matche `admin.user`, l'accès est accordé).
    // Surcharger ici avec `({ req }) => Boolean(req.user)` casse les
    // server actions Next (form state, preferences) où req.user n'est
    // pas hydraté → 401 → cascade sur le PATCH suivant qui finit en 403.
    unlock: isAdminOrRoot,
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      label: 'Nom affiché',
      required: false,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      // Bootstrap : le premier compte créé sur une base vierge est par
      // défaut « root » (cas register-first-user). Les comptes suivants
      // tombent sur « editor » par défaut (l'inviteur·ice peut promouvoir
      // côté formulaire d'invitation).
      defaultValue: async ({ req }) => {
        if (!req?.payload) return 'editor';
        try {
          const existing = await req.payload.find({
            collection: 'users',
            limit: 1,
            depth: 0,
            overrideAccess: true,
          });
          return existing.totalDocs === 0 ? 'root' : 'editor';
        } catch {
          return 'editor';
        }
      },
      options: [
        { label: 'Root', value: 'root' },
        { label: 'Admin', value: 'admin' },
        { label: 'Éditeur·ice', value: 'editor' },
      ],
      access: {
        update: canMutateRole,
      },
      hooks: {
        beforeChange: [lockRoleField],
      },
      admin: {
        description: 'Root = compte propriétaire (1 seul, non supprimable). Admin = peut gérer les comptes. Éditeur·ice = édite le contenu.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'En attente d\'activation', value: 'pending' },
        { label: 'Actif', value: 'active' },
        { label: 'Désactivé', value: 'disabled' },
      ],
      // Status muté uniquement programmatiquement : par l'endpoint
      // d'acceptation d'invitation (pending → active) et par les futurs
      // boutons admin (active → disabled). Pas modifiable via le formulaire
      // pour éviter qu'un user en flux d'invitation puisse le changer
      // ou que quelqu'un crée des incohérences manuellement.
      access: { update: () => false },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Géré automatiquement par le système d\'invitation.',
        // Masqué pendant la création (formulaire register-first-user et
        // toute future création directe) : la valeur est posée par
        // defaultValue/hooks, pas par l'utilisateur.
        condition: (data) => Boolean(data?.id),
      },
    },

    // ─── Panneau Sécurité (UI only, ne stocke rien) ────────────────
    // Field type:'ui' = composant React rendu dans le formulaire user.
    // Apparaît à la fois sur /cms/admin/account et /cms/admin/collections/
    // users/:id, mais le `condition` ci-dessous ne le rend visible que
    // sur son propre profil — vu que les boutons actionnent /me/*, on
    // ne veut pas qu'un admin voie ce panneau sur le profil d'un editor.
    {
      name: 'security',
      type: 'ui',
      admin: {
        condition: (data, _siblingData, { user }) => {
          if (!user || !data?.id) return false;
          return String(data.id) === String(user.id);
        },
        components: {
          Field: '@/components/auth/AccountSecurity#default',
        },
      },
    },

    // ─── Invitation (workflow d'activation) ──────────────────────────
    {
      name: 'invitation',
      type: 'group',
      admin: { hidden: true },
      access: {
        read: isSelfOrAdmin,
        update: () => false,
      },
      fields: [
        { name: 'tokenHash', type: 'text', index: true },
        { name: 'expiresAt', type: 'date' },
        { name: 'invitedBy', type: 'relationship', relationTo: 'users' },
        { name: 'invitedAt', type: 'date' },
      ],
    },

    // ─── 2FA email (le seul mode supporté) ──────────────────────────
    {
      name: 'twoFactor',
      type: 'group',
      admin: { hidden: true },
      access: {
        read: isSelfOrAdmin,
        update: () => false,
      },
      fields: [
        { name: 'emailCodeHash', type: 'text' },
        { name: 'emailCodeExpiresAt', type: 'date' },
        { name: 'emailCodeAttempts', type: 'number', defaultValue: 0 },
      ],
    },

    // ─── Sessions / activité ─────────────────────────────────────────
    // Masqués pendant la création — n'ont aucun sens avant que le compte
    // ait existé.
    {
      name: 'lastActivityAt',
      type: 'date',
      access: { read: isSelfOrAdmin, update: () => false },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => Boolean(data?.id),
      },
    },
    {
      name: 'lastLoginAt',
      type: 'date',
      access: { read: isSelfOrAdmin, update: () => false },
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data) => Boolean(data?.id),
      },
    },

    // ─── Trusted devices (post-OTP, 7 jours) ─────────────────────────
    {
      name: 'trustedDevices',
      type: 'array',
      access: { read: isSelfOrAdmin, update: () => false },
      admin: { hidden: true },
      fields: [
        { name: 'deviceId', type: 'text', required: true },
        { name: 'fingerprintHash', type: 'text', required: true },
        { name: 'label', type: 'text' },
        { name: 'userAgent', type: 'text' },
        { name: 'ip', type: 'text' },
        { name: 'createdAt', type: 'date', required: true },
        { name: 'expiresAt', type: 'date', required: true },
      ],
    },
  ],

  hooks: {
    // Garde l'unicité du root et empêche sa suppression / rétrogradation.
    beforeChange: [
      // Politique mot de passe : 12 caractères min (recommandation NIST
      // SP 800-63B — longueur > complexité forcée). On pose le check ici
      // plutôt que sur le field `password` parce que ce dernier est
      // auto-géré par Payload (pas surchargeable directement).
      async ({ data }) => {
        if (typeof data?.password === 'string' && data.password.length > 0 && data.password.length < 12) {
          throw new Error(
            'Le mot de passe doit contenir au moins 12 caractères.',
          );
        }
        return data;
      },
      // Empêche les admins de changer le mot de passe d'un autre user.
      // Le password est self-managed : chacun le change via /cms/admin/account
      // (panneau Sécurité). L'admin/root ne peut PAS reset le mdp de qq d'autre
      // depuis la liste — pour ça il faut passer par le flow forgot-password
      // qui envoie un mail à l'utilisateur cible.
      //
      // Le check s'applique uniquement aux requêtes authentifiées (req.user
      // présent). Les flows programmatiques (acceptation d'invitation, reset
      // via token de mail) passent avec req.user undefined → autorisés.
      async ({ data, originalDoc, operation, req }) => {
        if (
          operation === 'update' &&
          data?.password &&
          req.user &&
          String(req.user.id) !== String(originalDoc?.id)
        ) {
          throw new Error(
            'Vous ne pouvez pas modifier le mot de passe d\'un autre utilisateur. ' +
              'Demandez-lui d\'utiliser « Mot de passe oublié » sur la page de connexion.',
          );
        }
        return data;
      },
      async ({ data, originalDoc, operation, req }) => {
        if (operation === 'create' && data?.role === 'root') {
          // Création d'un root : autorisée uniquement s'il n'en existe pas
          // déjà un (cas du bootstrap initial via register-first-user).
          const existingRoot = await req.payload.find({
            collection: 'users',
            where: { role: { equals: 'root' } },
            limit: 1,
            req,
          });
          if (existingRoot.totalDocs > 0) {
            throw new Error('Un compte root existe déjà.');
          }
        }
        // Empêche un changement implicite role=root via update — sauf si
        // l'opération vient d'une initialisation interne (req.user absent),
        // ce qui correspond au bootstrapRootUser exécuté dans onInit.
        if (
          operation === 'update' &&
          data?.role === 'root' &&
          originalDoc?.role !== 'root' &&
          req.user
        ) {
          throw new Error('Le rôle root ne peut pas être attribué via mise à jour.');
        }
        return data;
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const target = await req.payload.findByID({
          collection: 'users',
          id,
          req,
          depth: 0,
          overrideAccess: true,
        });
        if ((target as { role?: string }).role === 'root') {
          throw new Error('Le compte root ne peut pas être supprimé.');
        }
      },
    ],
  },
};
