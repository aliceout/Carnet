// Primitives crypto pour le système d'auth (invitations, OTP email, devices).
//
// Toutes les valeurs sensibles vont en base sous forme hachée :
//  - Tokens d'invitation, codes OTP email, fingerprints de devices
//    → hash SHA-256 (pas besoin de bcrypt : grande entropie, courte
//    durée de vie).
//
// Les comparaisons de tokens se font en temps constant.

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function safeEqualHex(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

// Token d'invitation, lien de reset, identifiant de device : 32 octets en
// base64url (43 chars). Entropie 256 bits, URL-safe, lisible dans un mail.
export function generateUrlSafeToken(): string {
  return randomBytes(32).toString('base64url');
}

// Code OTP email : 6 chiffres. randomInt évite le biais modulo.
export function generateNumericCode(digits = 6): string {
  const max = 10 ** digits;
  return randomInt(0, max).toString().padStart(digits, '0');
}
