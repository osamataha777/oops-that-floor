# Asset Licenses & Credits

## Original assets — no third-party content

Every visual and audio asset in this game is **generated procedurally in code at runtime**. There are no bundled image, audio, font, or tilemap files copied from any external source:

- **Character & tiles:** drawn at boot in `src/game/scenes/BootScene.ts` via Phaser `Graphics.generateTexture` — original "Oopsie" character, tile, spike, door, and UI textures.
- **Audio:** synthesized at runtime in `src/game/audio/synth.ts` via WebAudio oscillators/noise — no samples.
- **Share cards:** rendered locally on a canvas in `src/services/shareCard.ts`.
- **Fonts:** system font stack only (`system-ui, -apple-system, Segoe UI, Roboto`); no embedded fonts.
- **Levels:** all 40 ASCII maps are hand-authored original designs in `src/game/levels/ch1–ch5.ts`.

## Inspiration audit

The build was *inspired by* the trap vocabulary of Level Devil–style rage platformers. Two MIT-licensed reference repositories were studied for architecture/gameplay patterns:

- `github.com/arjan/leveldevil` (MIT) — Phaser/Vite/TS structure, movement feel reference.
- `github.com/Leonxlnx/level-devil` (MIT) — trap taxonomy and game-feel reference.

**No code, art, level data, audio, or branding was copied from either repository.** Level maps, character design, visual identity, UI, and all trap implementations are original work written for this project. MIT license notices are therefore not legally required to ship, but both projects are credited here in good faith.

## Runtime dependencies

| Package | License |
| --- | --- |
| phaser | MIT |
| @capacitor/* (core, app, cli, android, ios, haptics, preferences, share, filesystem) | MIT |
| vite, vitest, @playwright/test, typescript, tsx | MIT / Apache-2.0 |

All dependencies are permissively licensed for commercial distribution. `npm ls --omit=dev` enumerates the shipping set.

## Name & trademark

"Oops! That Floor!" is a working title chosen after a basic web search found no existing released game under that name. **A formal trademark clearance search is still required before store submission** (see `docs/RELEASE_CHECKLIST.md`). Alternatives on record: *Floor's Out!*, *Gotcha Ground*.

## Privacy

No accounts, no analytics, no ads, no network calls. All data lives on-device (`localStorage` / Capacitor Preferences). This satisfies store "data not collected" declarations as-is.
