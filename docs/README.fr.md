# Neon Breakout

[English](../README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md) | [한국어](README.ko.md) | [Русский](README.ru.md)

`breakout-web` intègre le jeu complet de Fable, ses graphismes néon, effets et sons, en remplaçant l'ancien jeu React par un moteur TypeScript natif. Compatible avec les navigateurs sur ordinateur et mobile ; le répertoire Fable d'origine reste inchangé.

## Développement et vérification

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

La chaîne existante Vite 5 + TypeScript 5.6 est conservée, sans nouvelle dépendance. Le résultat est un site statique standard dans `dist/`, à servir en HTTP(S), et non un fichier HTML unique à ouvrir par double-clic.

## Jeu

- Campagne de 5 chapitres et 30 niveaux, avec rencontres avec des boss, sélection des niveaux et étoiles
- Mode infini généré à partir d'une graine, avec un boss tous les 10 étages ; nouvelle graine à chaque nouvelle partie
- 11 objets : raquette élargie, ralentissement, multiballe, perforation, éventail de cinq balles, laser, aimant, bouclier, vie supplémentaire et deux effets négatifs : raquette rétrécie et accélération
- Double multiplie par 2 le nombre de balles présentes et Éventail par 5, avec un maximum de 200 au total ; les balles se déploient depuis la position de chaque balle autour de sa direction initiale.
- Des passages de chaque côté de la formation de briques permettent aux balles de passer au-dessus.
- Interface en 9 langues, détectée selon le navigateur au premier lancement et modifiable dans les paramètres

## Commandes

- Choisissez la campagne, un niveau débloqué ou le mode infini dans le menu
- Souris : déplacez pour viser, cliquez pour tirer ; après le tir, déplacez pour contrôler la raquette
- Clavier : ←/→ ou A/D pour la raquette ; Espace, ↑ ou W pour tirer ; Échap ou P pour mettre en pause/reprendre
- Tactile : glissez pour viser et relâchez pour tirer ; ensuite glissez n'importe où dans la zone de jeu pour déplacer la raquette
- Libérez une balle retenue par l'aimant par clic, relâchement ou touche de tir ; l'interface propose pause, nouvel essai, niveau suivant et menu principal

## Sauvegarde locale

`localStorage` conserve les niveaux débloqués, étoiles et meilleurs scores de campagne, le meilleur score et le plus haut étage terminé en mode infini, ainsi que la langue, les effets sonores et la musique. **Actualiser ne restaure pas la partie en cours**. Le stockage du navigateur doit être disponible pour conserver les records.

Les anciennes sauvegardes de `breakout-web` sont conservées, sans migration automatique car les règles des niveaux diffèrent. Les sauvegardes Fable du même origin (protocole, hôte, port) restent compatibles via la clé `neon-breakout:v1`. Changer d'origin ne transfère pas les données.
