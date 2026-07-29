# Neon Breakout

[English](README.md) | [简体中文](docs/README.zh-CN.md) | [繁體中文](docs/README.zh-TW.md) | [日本語](docs/README.ja.md) | [Español](docs/README.es.md) | [Français](docs/README.fr.md) | [Deutsch](docs/README.de.md) | [한국어](docs/README.ko.md) | [Русский](docs/README.ru.md)

A web breakout prototype for testing aim, paddle control, powerups, and level pacing. It works on desktop and mobile browsers.

## Run

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Test

```bash
bun run test
```

## Quality

```bash
bun run lint
bun run lint:fix
```

Styles are written in `src/styles.less`.

## Gameplay

- Click Start, aim first, then click or release your finger to fire
- Desktop uses mouse or arrow keys after launch; mobile uses touch drag
- Clear all breakable bricks to pass a level
- After a clear, the popup fades in while balls and powerups keep leaving the screen
- Each level has 3 lives, with pause, continue, retry, and main menu actions
- The first visit detects your browser language; progress, sound, and language choices are saved in this browser

## Bricks And Powerups

- Bricks can take 1–12 hits
- Gray obstacles do not break; their shapes change the ball trajectory
- Powerups include wide paddle, slow, double ball, pierce, and burst five balls

## Main Files

- `src/App.tsx`: UI, dialogs, and input
- `src/game.ts`: game rules and level flow
- `src/geometry.ts`: collision helpers
- `src/render.ts`: canvas rendering
- `src/i18n.ts`: interface translations
