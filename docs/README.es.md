# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

`breakout-web` integra el juego completo de Fable, sus gráficos de neón, efectos y audio, sustituyendo el antiguo juego React por un motor nativo TypeScript. Compatible con navegadores de escritorio y móviles; el directorio original de Fable no se modifica.

## Desarrollo y verificación

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

Se conserva Vite 5 + TypeScript 5.6, sin nuevas dependencias. La compilación genera un sitio estático estándar en `dist/`: debe servirse por HTTP(S), no es un único HTML que se abre con doble clic.

## Juego

- Campaña de 5 capítulos y 30 niveles, con encuentros con jefes, selección de niveles y estrellas
- Modo infinito con generación procedural por semilla, un jefe cada 10 pisos y una nueva semilla en cada partida nueva
- 11 objetos: pala ancha, ralentización, multibola, perforación, abanico de cinco bolas, láser, imán, escudo, vida extra y dos efectos negativos: pala corta y aceleración
- Doble multiplica por 2 las bolas actuales y Abanico por 5, hasta un máximo total de 200; las bolas se abren en abanico desde la posición de cada bola existente alrededor de su dirección original.
- Los pasillos a ambos lados de la formación de bloques permiten llegar al espacio superior.
- 9 idiomas de interfaz; detección inicial del idioma del navegador y selección en ajustes

## Controles

- Elige campaña, un nivel desbloqueado o modo infinito en el menú
- Ratón: mueve para apuntar y haz clic para lanzar; después mueve la pala con el ratón
- Teclado: ←/→ o A/D para la pala; Espacio, ↑ o W para lanzar; Esc o P para pausar/reanudar
- Pantalla táctil: arrastra para apuntar y suelta para lanzar; después arrastra en cualquier parte del área de juego para mover la pala
- Lanza las bolas retenidas por el imán con clic, al soltar el dedo o con una tecla de lanzamiento; la interfaz permite pausar, reintentar, avanzar y volver al menú

## Guardado en el navegador

`localStorage` guarda desbloqueos, estrellas y mejores puntuaciones de campaña, récord de puntuación y piso más alto completado en infinito, además de idioma, efectos de sonido y música. **Recargar no restaura la partida en curso**. Los registros solo persisten si el almacenamiento está disponible.

Se conservan los datos antiguos de `breakout-web`, sin migración automática porque las reglas de los niveles son distintas. Los datos de Fable del mismo origin (protocolo, host y puerto) siguen siendo compatibles con la clave `neon-breakout:v1`. Cambiar de origin no transfiere los datos.
