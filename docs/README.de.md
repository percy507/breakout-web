# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

Ein Web-Breakout-Prototyp zum Testen von Zielen, Paddle-Steuerung, Powerups und Level-Rhythmus. Er läuft in Desktop- und mobilen Browsern.

## Starten

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

## Qualität

```bash
bun run lint
bun run lint:fix
```

Styles liegen in `src/styles.less`.

## Gameplay

- Klicke auf Starten, ziele zuerst und klicke dann oder lass los, um zu schießen
- Desktop nutzt nach dem Start Maus oder Pfeiltasten; mobil wird gezogen
- Zerstöre alle zerstörbaren Steine, um das Level zu schaffen
- Nach dem Clear blendet das Popup ein, während Bälle und Powerups auslaufen
- Jedes Level hat 3 Leben, mit Pause, Weiter, Neu versuchen und Hauptmenü
- Beim ersten Besuch wird die Browsersprache erkannt; Fortschritt, Ton und Sprache werden in diesem Browser gespeichert

## Steine und Powerups

- Steine brauchen 1 bis 12 Treffer
- Graue Hindernisse brechen nicht; ihre Formen ändern die Ballbahn
- Powerups sind breites Paddle, Verlangsamen, Doppelball, Durchschuss und Fünferfächer

## Hauptdateien

- `src/App.tsx`: UI, Dialoge und Eingabe
- `src/game.ts`: Spielregeln und Level-Fluss
- `src/geometry.ts`: Kollisionshilfen
- `src/render.ts`: Canvas-Rendering
- `src/i18n.ts`: UI-Übersetzungen
