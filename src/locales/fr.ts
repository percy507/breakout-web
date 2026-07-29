import type { TranslationResource } from './en';

const translation = {
  app: {
    eyebrow: 'NEON BREAKOUT',
    title: 'Neon Breakout',
    mute: 'Muet',
    unmute: 'Activer le son',
    resetConfirm: 'Réinitialiser la progression et le meilleur score ?',
  },
  stats: {
    level: 'Niveau',
    lives: 'Vies',
    score: 'Score',
    bestScore: 'Record',
    highestUnlocked: 'Niv. max',
    ballCount: 'Balles',
  },
  status: {
    ready: 'Commencez quand vous voulez',
    aiming: 'Visez, puis tirez',
    playing: 'En jeu',
    paused: 'Pause',
    lifeLost: 'Vie perdue',
    levelClear: 'Niveau réussi',
    gameOver: 'Réessayez',
  },
  actions: {
    start: 'Démarrer',
    continue: 'Continuer',
    fire: 'Tirer',
    help: 'Aide',
    close: 'Fermer',
    nextLevel: 'Niveau suivant',
    retry: 'Réessayer',
    resetProgress: 'Réinitialiser',
    backToMenu: 'Menu principal',
  },
  menu: {
    subtitle: 'Cassez les briques, attrapez les bonus et survivez au niveau.',
  },
  help: {
    aria: 'Aide du jeu',
    intro:
      'Visez d’abord. La raquette reste immobile pendant la visée. Déplacez la souris ou faites glisser pour ajuster, puis cliquez à nouveau ou relâchez pour tirer.',
    powerSeparator: ', ',
    activePowers: 'Actifs : {{powers}}',
    inactivePowers: 'Bonus : agrandir, ralentir, multiballe, percer, rafale',
    controlsTitle: 'Contrôles',
    controlsPc: 'PC : déplacez la souris pour viser, puis pour contrôler la raquette',
    controlsMobile: 'Mobile : faites glisser pour viser, puis pour contrôler la raquette',
    controlsPause: 'En jeu : Échap, P, Espace ou le bouton en haut à droite met en pause',
    bricksTitle: 'Briques',
    bricksNormal:
      'Les briques normales cassent en 1 coup ; les dures tiennent jusqu’à 12 coups',
    bricksNumber: 'Le nombre sur une brique indique les coups restants',
    bricksObstacle: 'Les obstacles gris ne cassent pas ; ils dévient seulement la balle',
    powerupsTitle: 'Bonus',
    powerupsPierce: 'Percer retire 3 coups à chaque brique traversée',
    powerupsMulti: 'Multiballe et rafale s’appliquent à toutes les balles actuelles',
    powerupsLimit: 'Jusqu’à 100 balles peuvent être à l’écran',
    rulesTitle: 'Règles',
    rulesLives: 'Chaque niveau a 3 vies ; après une perte, continuez depuis la fenêtre',
    rulesClear: 'Cassez toutes les briques destructibles pour réussir le niveau',
    rulesSpeed: 'La vitesse de la balle augmente progressivement pendant la vie actuelle',
    rulesSave: 'La progression et le record sont enregistrés dans ce navigateur',
  },
  modal: {
    passedTitle: 'Niveau {{level}} réussi',
    failedTitle: 'Niveau échoué',
    lostLifeTitle: 'Balle perdue',
    pausedTitle: 'Pause',
    passedDescription: 'Le suivant est le niveau {{nextLevel}}.',
    failedDescription:
      'Plus de vies. Réessayez ce niveau ou retournez au menu principal.',
    lostLifeDescription: 'Vies restantes × {{lives}}',
    pausedDescription: 'Le jeu est en pause. Continuez ou retournez au menu principal.',
  },
  powerups: {
    wide: 'Raquette large',
    slow: 'Ralentir',
    multi: 'Double balle',
    pierce: 'Percer',
    burst: 'Rafale de cinq',
  },
  canvas: {
    pause: 'Pause',
  },
} satisfies TranslationResource;

export default translation;
