/**
 * Deterministic challenge codes — no backend.
 * Payload: linear level index (0-39) + a death target (0-99).
 * Format:  OTF-<2 base36 level>-<2 base36 deaths>-<1 base36 checksum>
 * Example: OTF-0A-05-Q  → level index 10, beat it in ≤5 deaths.
 */

const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PREFIX = 'OTF';

export interface Challenge {
  levelIndex: number;
  deaths: number;
}

function checksum(levelIndex: number, deaths: number): string {
  return B36[(levelIndex * 31 + deaths * 7 + 5) % 36];
}

const b36 = (n: number, len: number) => n.toString(36).toUpperCase().padStart(len, '0');

export function encodeChallenge(c: Challenge): string {
  const li = Math.min(99, Math.max(0, Math.floor(c.levelIndex)));
  const d = Math.min(99, Math.max(0, Math.floor(c.deaths)));
  return `${PREFIX}-${b36(li, 2)}-${b36(d, 2)}-${checksum(li, d)}`;
}

/**
 * Decode + validate. Returns null on any malformed input.
 * `maxLevelIndex` lets the caller clamp to levels that actually exist.
 */
export function decodeChallenge(code: string, maxLevelIndex = 39): Challenge | null {
  if (typeof code !== 'string') return null;
  const clean = code.trim().toUpperCase().replace(/\s+/g, '');
  const m = /^OTF-([0-9A-Z]{2})-([0-9A-Z]{2})-([0-9A-Z])$/.exec(clean);
  if (!m) return null;
  const li = parseInt(m[1], 36);
  const d = parseInt(m[2], 36);
  if (!Number.isFinite(li) || !Number.isFinite(d)) return null;
  if (m[3] !== checksum(li, d)) return null;
  if (li > maxLevelIndex || d > 99) return null;
  return { levelIndex: li, deaths: d };
}

export function challengeText(c: Challenge, levelId: string): string {
  const code = encodeChallenge(c);
  return c.deaths === 0
    ? `I cleared level ${levelId} of Oops! That Floor! without dying. Beat that. Code: ${code}`
    : `Level ${levelId} took me ${c.deaths} ${c.deaths === 1 ? 'try' : 'tries'} in Oops! That Floor! Think you can do better? Code: ${code}`;
}
