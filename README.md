# Oops! That Floor!

An original mobile-first rage-platformer built with **Phaser 3 + TypeScript + Vite**, packaged for **Android and iOS** with **Capacitor 8**.

The floor is a liar. Cross 40 hand-designed levels of collapsing planks, shy doors, gravity betrayals, and chain-reaction comedy. Die, laugh, respawn in under a second, and try again.

## Quick start

```bash
npm install          # install dependencies
npm run dev          # dev server → http://localhost:5173
```

Open in a browser. Use ←/→ or A/D to move, Space/W/↑ to jump, Esc to pause. Touch controls appear automatically on touch devices.

## Commands

| Task | Command |
| --- | --- |
| Install dependencies | `npm install` |
| Run locally (dev server) | `npm run dev` |
| Run unit + integration tests | `npm test` (alias: `npx vitest run`) |
| Run browser E2E (incl. all-40-levels replay proof) | `npm run test:e2e` (needs `npx playwright install chromium` once) |
| Prove every level via input replay | `npm run build && npx vite preview --port 4173 &` then `node scripts/verify-levels.mjs` |
| Trace / search / jitter-test a route | `node scripts/trace.mjs 1-4 "R140 RJ20 …"` · `scripts/search.mjs` · `scripts/forgiveness.mjs` |
| Screenshots / recordings / perf | `scripts/shoot.mjs` · `scripts/record.mjs` · `scripts/perf.mjs --headed` |
| Validate all 40 levels | `npm run validate:levels` |
| Build web assets | `npm run build` (outputs `dist/`) |
| Preview production build | `npm run preview` |
| Typecheck | `npm run typecheck` |
| Sync Capacitor | `npx cap sync` |
| Open Android project | `npx cap open android` |
| Open iOS project | `npx cap open ios` |
| Android debug APK | `cd android && ./gradlew assembleDebug` |
| Android release bundle | `cd android && ./gradlew bundleRelease` (needs signing config — see `docs/MOBILE_BUILD.md`) |
| iOS release archive | Xcode → Product → Archive (see `docs/MOBILE_BUILD.md`) |

> **Android note:** the Gradle build requires JDK 21 (Capacitor 8 / Gradle toolchain). On this machine the Android Studio bundled JBR-21 is used:
> `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug`

## Project layout

```
src/
  game/
    core/        config, palette, service registry
    physics/     movement math (pure TS, unit tested)
    levels/      ASCII-map level DSL, parser, validator, 40 levels (ch1–ch5)
    traps/       trap engine: context, base class, 14 implementations
    entities/    player controller (coyote, buffer, variable jump)
    runtime/     LevelRuntime — builds/resets a level in a scene
    scenes/      Boot, Menu, LevelSelect, Game
    ui/          theme, widgets, TouchControls, SettingsPanel
    audio/       procedural WebAudio synth + AudioManager
    effects/     death animations, quips, particles, shake
  services/      save schema, progress, achievements, challenge codes,
                 storage, share cards (pure TS, unit tested)
  platform/      native adapter (haptics, share, back button, safe area)
scripts/         level validator CLI
tests/           vitest unit + integration suites, Playwright smoke
docs/            design, architecture, build, test, release docs
android/ ios/    native Capacitor projects
```

## Game

- **40 original levels** in 5 chapters: Trust Nothing → Everything Moves → The Rules Changed → Chaos Academy → Final Betrayal.
- **14 trap types**: collapse floors, hidden spikes, falling blocks, surprise walls, crushers, moving platforms, conveyors, fake doors, shy goals, pressure plates, gravity flips, spinners — combined into chain reactions.
- **Instant restart**: death → gag animation → control back in <700 ms, no scene reload.
- **Persistence**: sequential unlocks, per-level attempts, deaths, settings — versioned local save, survives corruption.
- **Sharing**: locally generated funny-failure cards + `OTF-` challenge codes (deterministic, checksummed, offline).
- **Offline-first**: no accounts, no network calls, no ads, no tracking.

All art and audio are generated procedurally in code — no third-party assets, see `docs/ASSET_LICENSES.md`.

## Name

Working title shipped as **"Oops! That Floor!"**. Alternatives considered: *Floor's Out!*, *Gotcha Ground*. A basic search found no existing game using this name; a formal trademark check is still listed in `docs/RELEASE_CHECKLIST.md` before store submission.
