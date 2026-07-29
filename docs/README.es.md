# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

Un prototipo web de breakout para probar apuntado, control de la pala, poderes y ritmo de niveles. Funciona en navegadores de escritorio y móviles.

## Ejecutar

```bash
bun install
bun run dev
```

## Compilar

```bash
bun run build
```

## Probar

```bash
bun run test
```

## Calidad

```bash
bun run lint
bun run lint:fix
```

Los estilos están en `src/styles.less`.

## Juego

- Haz clic en Empezar, apunta y luego haz clic o suelta el dedo para disparar
- En escritorio se usa ratón o flechas después del lanzamiento; en móvil se arrastra
- Rompe todos los ladrillos destruibles para superar el nivel
- Al superarlo, el popup aparece gradualmente mientras bolas y poderes salen de pantalla
- Cada nivel tiene 3 vidas, con pausa, continuar, reintentar y menú principal
- En la primera visita se detecta el idioma del navegador; el progreso, sonido e idioma se guardan en este navegador

## Ladrillos y poderes

- Los ladrillos pueden requerir de 1 a 12 golpes
- Los obstáculos grises no se rompen; sus formas cambian la trayectoria de la bola
- Los poderes incluyen pala ancha, ralentizar, doble bola, perforar y ráfaga de cinco bolas

## Archivos principales

- `src/App.tsx`: UI, diálogos y entrada
- `src/game.ts`: reglas y flujo de niveles
- `src/geometry.ts`: ayudas de colisión
- `src/render.ts`: renderizado canvas
- `src/i18n.ts`: traducciones de la interfaz
