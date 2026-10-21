import { describe, it, expect } from 'vitest';
import { encodeChallenge, decodeChallenge, challengeText } from '../../src/services/challenge';

describe('challenge codes', () => {
  it('round-trips all valid payloads', () => {
    for (const li of [0, 7, 15, 33, 35, 39]) {
      for (const d of [0, 1, 12, 99]) {
        const c = { levelIndex: li, deaths: d };
        const dec = decodeChallenge(encodeChallenge(c));
        expect(dec).not.toBeNull();
        expect(dec!.deaths).toBe(d);
        expect(dec!.levelIndex).toBe(li);
      }
    }
  });
  it('encodes deterministically', () => {
    expect(encodeChallenge({ levelIndex: 10, deaths: 5 })).toBe(encodeChallenge({ levelIndex: 10, deaths: 5 }));
    expect(encodeChallenge({ levelIndex: 10, deaths: 5 })).toMatch(/^OTF-[0-9A-Z]{2}-[0-9A-Z]{2}-[0-9A-Z]$/);
  });
  it('rejects tampered checksums', () => {
    const code = encodeChallenge({ levelIndex: 5, deaths: 9 });
    const bad = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
    expect(decodeChallenge(bad)).toBeNull();
  });
  it('rejects malformed input', () => {
    for (const bad of ['', 'hello', 'OTF', 'OTF-ZZ-ZZ-Z', 'XYZ-00-00-0', 'OTF-000-00-0', null as unknown as string]) {
      expect(decodeChallenge(bad)).toBeNull();
    }
  });
  it('rejects out-of-range levels', () => {
    const c = encodeChallenge({ levelIndex: 35, deaths: 0 });
    expect(decodeChallenge(c, 30)).toBeNull();
    expect(decodeChallenge(c, 39)).not.toBeNull();
  });
  it('accepts whitespace/case fuzz', () => {
    const c = encodeChallenge({ levelIndex: 3, deaths: 4 }).toLowerCase();
    expect(decodeChallenge(` ${c} `)).not.toBeNull();
  });
  it('builds share text', () => {
    expect(challengeText({ levelIndex: 0, deaths: 0 }, '1-1')).toContain('OTF-');
    expect(challengeText({ levelIndex: 0, deaths: 7 }, '1-1')).toContain('7 tries');
  });
});
