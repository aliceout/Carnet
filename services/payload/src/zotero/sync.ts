// Logique de sync Zotero → Bibliography. Service pur (pas de HTTP).
// Appelé depuis l'endpoint `/users/me/zotero-sync` (cf endpoints.ts).
//
// Le sync :
//   1. Lit les credentials chiffrés du user, déchiffre la clé.
//   2. Pagine sur Zotero (since = lastSyncVersion).
//   3. Pour chaque item :
//      - Map vers le shape Bibliography (skip si data manquante)
//      - Upsert : query bibliography où zoteroKey=item.key, owner=user
//        - Si trouvé → update (avec req.context.zoteroSync = true pour
//          bypass le hook qui verrouille les refs zotero)
//        - Sinon → create
//   4. Update user.zotero.lastSync* avec les compteurs.

import type { Payload, PayloadRequest } from 'payload';

import { decrypt } from '../lib/crypto';
import { fetchAllItems, type ZoteroCreds, type ZoteroLibraryType } from './api';
import { mapItem, makeSlug } from './mapping';
import type { ZoteroSyncResult } from './types';

type UserDoc = {
  id: string | number;
  zotero?: {
    apiKey?: string | null;
    libraryId?: string | null;
    libraryType?: ZoteroLibraryType | null;
    lastSyncVersion?: number | null;
  };
};

/**
 * Lit le user en bypassant l'access read (sinon afterRead masque la
 * clé, qu'on a besoin de déchiffrer). Renvoie les credentials prêts
 * à l'emploi ou lève une erreur explicite si la config est incomplète.
 */
async function loadCreds(
  payload: Payload,
  userId: string | number,
  baseReq?: PayloadRequest,
): Promise<{ creds: ZoteroCreds; lastSyncVersion: number }> {
  // `zoteroRawRead: true` dit au hook afterRead de ne pas masquer la
  // clé API — sinon on récupère `••••••••XXXX` et decrypt() casse.
  // C'est sûr ici parce qu'on est côté serveur dans un endpoint qui
  // a déjà vérifié que c'est le user lui-même qui demande son sync.
  const reqWithFlag = baseReq
    ? { ...baseReq, context: { ...(baseReq.context ?? {}), zoteroRawRead: true } }
    : undefined;
  const raw = (await payload.findByID({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    depth: 0,
    req: reqWithFlag,
  })) as UserDoc;

  const z = raw.zotero;
  if (!z?.apiKey) {
    throw new Error('Aucune clé API Zotero configurée pour ce compte.');
  }
  if (!z.libraryId) {
    throw new Error('Aucun ID utilisateur Zotero configuré.');
  }
  const libType: ZoteroLibraryType = z.libraryType === 'group' ? 'group' : 'user';

  let apiKey: string;
  try {
    apiKey = decrypt(z.apiKey);
  } catch {
    throw new Error('Impossible de déchiffrer la clé API. Re-saisis-la et réessaie.');
  }

  return {
    creds: {
      apiKey,
      libraryId: String(z.libraryId),
      libraryType: libType,
    },
    lastSyncVersion: typeof z.lastSyncVersion === 'number' ? z.lastSyncVersion : 0,
  };
}

/**
 * Cherche une ref Bibliography déjà importée pour ce user et cette
 * clé Zotero. `null` si elle n'existe pas encore (à créer).
 */
async function findExistingRef(
  payload: Payload,
  userId: string | number,
  zoteroKey: string,
): Promise<{ id: string | number } | null> {
  const slug = makeSlug(userId, zoteroKey);
  const res = await payload.find({
    collection: 'bibliography',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const doc = res.docs[0] as { id?: string | number } | undefined;
  return doc?.id != null ? { id: doc.id } : null;
}

/**
 * Sync principal. Appelé par l'endpoint POST `/users/me/zotero-sync`.
 */
export async function syncZoteroForUser(opts: {
  payload: Payload;
  userId: string | number;
  req?: PayloadRequest;
}): Promise<ZoteroSyncResult> {
  const { payload, userId, req } = opts;
  const { creds, lastSyncVersion } = await loadCreds(payload, userId, req);

  const result: ZoteroSyncResult = {
    added: 0,
    updated: 0,
    errors: [],
    newVersion: lastSyncVersion,
  };

  const { newVersion } = await fetchAllItems(creds, lastSyncVersion, async (items) => {
    for (const item of items) {
      try {
        const mapped = mapItem(item);
        if (!mapped) {
          // Item inutilisable (manque titre / année / auteurs). On le
          // logge en errors mais on ne l'ajoute pas — l'autrice peut
          // compléter dans Zotero puis re-sync.
          result.errors.push({
            key: item.key,
            reason: 'Item incomplet (titre, année ou auteurs manquants).',
          });
          continue;
        }
        const existing = await findExistingRef(payload, userId, item.key);
        const data = {
          ...mapped,
          slug: makeSlug(userId, item.key),
          owner: userId,
        };
        // `req.context.zoteroSync = true` est le flag que le hook
        // beforeChange de Bibliography reconnaît pour bypass le
        // verrouillage des refs source='zotero'. Indispensable pour
        // un update.
        const context = { ...(req?.context ?? {}), zoteroSync: true };

        if (existing) {
          await payload.update({
            collection: 'bibliography',
            id: existing.id,
            data,
            overrideAccess: true,
            req: req ? { ...req, context } : undefined,
            context,
          });
          result.updated += 1;
        } else {
          await payload.create({
            collection: 'bibliography',
            data,
            overrideAccess: true,
            req: req ? { ...req, context } : undefined,
            context,
          });
          result.added += 1;
        }
      } catch (err) {
        result.errors.push({
          key: item.key,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
  });

  result.newVersion = newVersion;

  // Persiste l'état de sync sur le user. Les champs lastSync* ont
  // access.update: false côté collection, donc overrideAccess obligatoire.
  await payload.update({
    collection: 'users',
    id: userId,
    overrideAccess: true,
    data: {
      zotero: {
        lastSyncAt: new Date().toISOString(),
        lastSyncVersion: newVersion,
        lastSyncAdded: result.added,
        lastSyncUpdated: result.updated,
        lastSyncError: result.errors.length > 0 ? `${result.errors.length} item(s) ignoré(s)` : '',
      },
    },
  });

  return result;
}
