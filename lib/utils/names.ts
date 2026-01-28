/**
 * Portuguese particles (de, da, dos, das, e) kept lowercase in names.
 * Match case-insensitively.
 */
const PT_PARTICLES = new Set(['de', 'da', 'dos', 'das', 'e']);

/**
 * Normalizes a name for Brazilian Portuguese:
 * - First letter of each word capitalized
 * - Particles (de, da, dos, das, e) lowercase
 * - Handles accents (e.g. "JOÃO" → "João")
 *
 * @param value - Raw name string
 * @returns Normalized name, or '' if empty/whitespace-only
 */
export function normalizeNameBR(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/).filter(Boolean);
  const result = words.map((word) => {
    const lower = word.toLowerCase();
    if (PT_PARTICLES.has(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return result.join(' ');
}

/**
 * Returns true if the value has at least two space-separated words (nome e sobrenome).
 * Used for full-name validation in registration and API.
 */
export function hasFullName(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  return words.length >= 2;
}
