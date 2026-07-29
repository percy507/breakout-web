type WidenStrings<T> = T extends string
  ? string
  : { [Key in keyof T]: WidenStrings<T[Key]> };

const translation = {
  app: {
    eyebrow: 'NEON BREAKOUT',
    title: 'Neon Breakout',
    mute: 'Mute',
    unmute: 'Sound On',
    resetConfirm: 'Reset level progress and best score?',
  },
  stats: {
    level: 'Level',
    lives: 'Lives',
    score: 'Score',
    bestScore: 'Best',
    highestUnlocked: 'Top Level',
    ballCount: 'Balls',
  },
  status: {
    ready: 'Start when ready',
    aiming: 'Aim, then fire',
    playing: 'Playing',
    paused: 'Paused',
    lifeLost: 'Life lost',
    levelClear: 'Level clear',
    gameOver: 'Try again',
  },
  actions: {
    start: 'Start',
    continue: 'Continue',
    fire: 'Fire',
    help: 'Help',
    close: 'Close',
    nextLevel: 'Next Level',
    retry: 'Retry',
    resetProgress: 'Reset Progress',
    backToMenu: 'Main Menu',
  },
  menu: {
    subtitle: 'Clear bricks, catch powerups, and survive the level.',
  },
  help: {
    aria: 'Game Help',
    intro:
      'Aim first. The paddle stays still while you aim. Move the mouse or drag to adjust, then click again or release to fire.',
    powerSeparator: ', ',
    activePowers: 'Active: {{powers}}',
    inactivePowers: 'Powerups: widen, slow, multi-ball, pierce, burst',
    controlsTitle: 'Controls',
    controlsPc: 'PC: move the mouse to aim, then move the mouse to control the paddle',
    controlsMobile: 'Mobile: drag to aim, then drag to control the paddle',
    controlsPause: 'In game: Esc, P, Space, or the top-right button pauses',
    bricksTitle: 'Bricks',
    bricksNormal: 'Normal bricks break in 1 hit; hard bricks take up to 12 hits',
    bricksNumber: 'The number on a brick shows remaining hits',
    bricksObstacle: 'Gray obstacles do not break; they only redirect the ball',
    powerupsTitle: 'Powerups',
    powerupsPierce: 'Pierce removes 3 hits from each brick it passes through',
    powerupsMulti: 'Multi-ball and burst apply to every current ball',
    powerupsLimit: 'Up to 100 balls can be on screen',
    rulesTitle: 'Rules',
    rulesLives: 'Each level has 3 lives; after losing one, continue from the popup',
    rulesClear: 'Clear all breakable bricks to pass the level',
    rulesSpeed: 'Ball speed increases smoothly during the current life',
    rulesSave: 'Progress and best score are saved in this browser',
  },
  modal: {
    passedTitle: 'Level {{level}} Clear',
    failedTitle: 'Level Failed',
    lostLifeTitle: 'Ball Lost',
    pausedTitle: 'Paused',
    passedDescription: 'Next up: level {{nextLevel}}.',
    failedDescription: 'No lives left. Retry this level or return to the main menu.',
    lostLifeDescription: 'Lives left × {{lives}}',
    pausedDescription: 'The game is paused. Continue or return to the main menu.',
  },
  powerups: {
    wide: 'Wide Paddle',
    slow: 'Slow',
    multi: 'Double Ball',
    pierce: 'Pierce',
    burst: 'Burst Five',
  },
  canvas: {
    pause: 'Pause',
  },
} as const;

export type TranslationResource = WidenStrings<typeof translation>;
export default translation;
