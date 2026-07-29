# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

Un prototype web de casse-briques pour tester la visée, le contrôle de la raquette, les bonus et le rythme des niveaux. Il fonctionne sur navigateurs desktop et mobiles.

## Lancer

```bash
bun install
bun run dev
```

## Compiler

```bash
bun run build
```

## Tester

```bash
bun run test
```

## Qualité

```bash
bun run lint
bun run lint:fix
```

Les styles sont dans `src/styles.less`.

## Gameplay

- Cliquez sur Démarrer, visez, puis cliquez ou relâchez le doigt pour tirer
- Sur desktop, utilisez la souris ou les flèches après le tir ; sur mobile, faites glisser
- Cassez toutes les briques destructibles pour réussir le niveau
- Après la réussite, la popup apparaît progressivement tandis que balles et bonus sortent
- Chaque niveau a 3 vies, avec pause, continuer, réessayer et menu principal
- La première visite détecte la langue du navigateur ; progression, son et langue sont sauvegardés dans ce navigateur

## Briques et bonus

- Les briques peuvent demander 1 à 12 coups
- Les obstacles gris ne cassent pas ; leur forme change la trajectoire de la balle
- Les bonus incluent raquette large, ralentir, double balle, percer et rafale de cinq balles

## Fichiers principaux

- `src/App.tsx` : UI, dialogues et entrées
- `src/game.ts` : règles et progression des niveaux
- `src/geometry.ts` : aides de collision
- `src/render.ts` : rendu canvas
- `src/i18n.ts` : traductions de l’interface
