# Neon Breakout

[English](README.md) | [简体中文](docs/README.zh-CN.md) | [繁體中文](docs/README.zh-TW.md) | [日本語](docs/README.ja.md) | [Español](docs/README.es.md) | [Français](docs/README.fr.md) | [Deutsch](docs/README.de.md) | [한국어](docs/README.ko.md) | [Русский](docs/README.ru.md)

Fable's complete gameplay, neon visuals, effects, and audio are integrated into `breakout-web`, replacing the old React game with a native TypeScript engine. Desktop and mobile browsers are supported; the original Fable directory remains unchanged.

## Development

```bash
bun install
bun run dev
```

```bash
bun run build
bun run test
bun run lint
bun run typecheck
```

The existing Vite 5 + TypeScript 5.6 toolchain is retained, with no new dependencies. Build output is a standard static site in `dist/`: serve it over HTTP(S), not as a single HTML file opened by double-clicking.

## Gameplay

- Campaign: 5 chapters, 30 levels, boss encounters, level selection, and stars
- Endless: seeded procedural levels with a boss every 10 floors; a new run gets a new seed
- 11 powerups: wide paddle, slow, multiball, pierce, five-ball spread, laser, magnet, shield, extra life, plus negative shrink and fast effects
- Double multiplies the current ball count by 2 and Spread by 5, up to 32 balls total; balls fan out from each existing ball’s position around its original direction.
- Passages on both sides of the brick formation let balls reach the space above it.
- 9 interface languages, detected from the browser on first visit and selectable in settings

## Controls

- Choose campaign, an unlocked level, or endless from the menu
- Mouse: move to aim, click to launch; after launch, move to control the paddle
- Keyboard: ←/→ or A/D control the paddle; Space, ↑, or W launch; Esc or P pause/resume
- Touch: drag to aim and release to launch; after launch, drag anywhere in the play area to move the paddle
- Click, release, or use a launch key to release a ball caught by the magnet; pause, retry, next level, and main menu are available through the interface

## Browser saves

`localStorage` saves campaign unlocks, stars and best scores, endless best score and highest cleared floor, plus language and sound/music preferences. Refreshing does **not** restore the current run. Storage must be available for records to persist.

Old `breakout-web` saves are retained but are not automatically migrated because level rules differ. Existing Fable saves on the same origin (scheme, host, port) remain compatible through the `neon-breakout:v1` key. Changing origin does not transfer saves.
