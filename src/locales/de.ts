import type { TranslationResource } from './en';

const translation = {
  app: {
    eyebrow: 'NEON BREAKOUT',
    title: 'Neon Breakout',
    mute: 'Stumm',
    unmute: 'Ton ein',
    resetConfirm: 'Level-Fortschritt und Bestpunktzahl zurücksetzen?',
  },
  stats: {
    level: 'Level',
    lives: 'Leben',
    score: 'Punkte',
    bestScore: 'Bestwert',
    highestUnlocked: 'Top-Level',
    ballCount: 'Bälle',
  },
  status: {
    ready: 'Starte, wenn du bereit bist',
    aiming: 'Zielen, dann schießen',
    playing: 'Im Spiel',
    paused: 'Pausiert',
    lifeLost: 'Leben verloren',
    levelClear: 'Level geschafft',
    gameOver: 'Erneut versuchen',
  },
  actions: {
    start: 'Starten',
    continue: 'Weiter',
    fire: 'Schießen',
    help: 'Hilfe',
    close: 'Schließen',
    nextLevel: 'Nächstes Level',
    retry: 'Neu versuchen',
    resetProgress: 'Zurücksetzen',
    backToMenu: 'Hauptmenü',
  },
  menu: {
    subtitle: 'Zerstöre Steine, sammle Powerups und überlebe das Level.',
  },
  help: {
    aria: 'Spielhilfe',
    intro:
      'Ziele zuerst. Das Paddle bleibt beim Zielen stehen. Bewege die Maus oder ziehe, um anzupassen, dann klicke erneut oder lass los, um zu schießen.',
    powerSeparator: ', ',
    activePowers: 'Aktiv: {{powers}}',
    inactivePowers: 'Powerups: verbreitern, verlangsamen, Multiball, Durchschuss, Fächer',
    controlsTitle: 'Steuerung',
    controlsPc: 'PC: Maus zum Zielen bewegen, danach mit der Maus das Paddle steuern',
    controlsMobile: 'Mobil: zum Zielen ziehen, danach per Ziehen das Paddle steuern',
    controlsPause: 'Im Spiel: Esc, P, Leertaste oder der Button oben rechts pausiert',
    bricksTitle: 'Steine',
    bricksNormal:
      'Normale Steine brechen nach 1 Treffer; harte halten bis zu 12 Treffer aus',
    bricksNumber: 'Die Zahl auf einem Stein zeigt verbleibende Treffer',
    bricksObstacle: 'Graue Hindernisse brechen nicht; sie lenken nur den Ball ab',
    powerupsTitle: 'Powerups',
    powerupsPierce: 'Durchschuss zieht jedem durchquerten Stein 3 Treffer ab',
    powerupsMulti: 'Multiball und Fächer wirken auf alle aktuellen Bälle',
    powerupsLimit: 'Bis zu 100 Bälle können gleichzeitig auf dem Bildschirm sein',
    rulesTitle: 'Regeln',
    rulesLives: 'Jedes Level hat 3 Leben; nach einem Verlust geht es im Popup weiter',
    rulesClear: 'Zerstöre alle zerstörbaren Steine, um das Level zu schaffen',
    rulesSpeed: 'Die Ballgeschwindigkeit steigt während des aktuellen Lebens sanft an',
    rulesSave: 'Fortschritt und Bestwert werden in diesem Browser gespeichert',
  },
  modal: {
    passedTitle: 'Level {{level}} geschafft',
    failedTitle: 'Level gescheitert',
    lostLifeTitle: 'Ball verloren',
    pausedTitle: 'Pausiert',
    passedDescription: 'Als Nächstes kommt Level {{nextLevel}}.',
    failedDescription:
      'Keine Leben mehr. Versuche das Level erneut oder kehre ins Hauptmenü zurück.',
    lostLifeDescription: 'Verbleibende Leben × {{lives}}',
    pausedDescription:
      'Das Spiel ist pausiert. Weiter spielen oder ins Hauptmenü zurückkehren.',
  },
  powerups: {
    wide: 'Breites Paddle',
    slow: 'Verlangsamen',
    multi: 'Doppelball',
    pierce: 'Durchschuss',
    burst: 'Fünferfächer',
  },
  canvas: {
    pause: 'Pause',
  },
} satisfies TranslationResource;

export default translation;
