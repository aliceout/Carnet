/**
 * Helpers utilitaires côté Astro — formatage de dates, slugs, citations,
 * calcul du temps de lecture, etc. Stub pour l'instant, à enrichir au fur
 * et à mesure que le design est porté.
 */

/** Mois français pleins (pas d'abréviations dans le carnet). */
const MOIS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/**
 * Formate une date ISO en chaîne lisible française : "14 avril 2026".
 * Utilisé dans les méta des billets (publication, mise à jour).
 */
export function formatDateFr(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format ISO court "YYYY-MM-DD" pour les pages archives (colonne date
 * mono).
 */
export function formatDateIso(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Calcule le temps de lecture en minutes — base 220 mots/min, arrondi
 * sup. Le champ existe aussi en BDD (set au save côté Payload), mais on
 * peut le re-calculer côté Astro pour les fragments dérivés.
 */
export function readingTimeMin(text: string, wpm = 220): number {
  const words = (text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / wpm));
}

/**
 * Numéro de billet formaté "n° 042" (zero-padding sur 3 chiffres).
 */
export function formatNumero(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (Number.isNaN(num)) return '';
  return `n° ${String(num).padStart(3, '0')}`;
}

/**
 * ID d'archivage "carnet:2026-042" — combine l'année de publication et
 * le numéro de billet, format figé.
 */
export function formatIdCarnet(year: number | string, n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  return `carnet:${year}-${String(num).padStart(3, '0')}`;
}
