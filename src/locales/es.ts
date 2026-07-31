import type { TranslationResource } from './en';

const translation = {
  app: {
    eyebrow: 'NEON BREAKOUT',
    title: 'Neon Breakout',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    resetConfirm: '¿Restablecer el progreso y la mejor puntuación?',
  },
  stats: {
    level: 'Nivel',
    lives: 'Vidas',
    score: 'Puntos',
    bestScore: 'Récord',
    highestUnlocked: 'Nivel máx.',
    ballCount: 'Bolas',
  },
  status: {
    ready: 'Empieza cuando quieras',
    aiming: 'Apunta y dispara',
    playing: 'Jugando',
    paused: 'Pausa',
    lifeLost: 'Vida perdida',
    levelClear: 'Nivel superado',
    gameOver: 'Inténtalo otra vez',
  },
  actions: {
    start: 'Empezar',
    continue: 'Continuar',
    fire: 'Disparar',
    help: 'Ayuda',
    settings: 'Ajustes',
    close: 'Cerrar',
    nextLevel: 'Siguiente nivel',
    retry: 'Reintentar',
    resetProgress: 'Restablecer',
    backToMenu: 'Menú principal',
  },
  menu: {
    subtitle: 'Rompe ladrillos, recoge poderes y sobrevive al nivel.',
  },
  help: {
    aria: 'Ayuda del juego',
    intro:
      'Primero apunta. La pala no se mueve mientras apuntas. Mueve el ratón o arrastra para ajustar, luego haz clic otra vez o suelta para disparar.',
    powerSeparator: ', ',
    activePowers: 'Activos: {{powers}}',
    inactivePowers: 'Poderes: ampliar, ralentizar, multibola, perforar, ráfaga',
    controlsTitle: 'Controles',
    controlsPc: 'PC: mueve el ratón para apuntar y después para controlar la pala',
    controlsMobile: 'Móvil: arrastra para apuntar y después para controlar la pala',
    controlsPause: 'En juego: Esc, P, Espacio o el botón superior derecho pausa',
    bricksTitle: 'Ladrillos',
    bricksNormal:
      'Los ladrillos normales se rompen de 1 golpe; los duros aguantan hasta 12',
    bricksNumber: 'El número del ladrillo indica los golpes restantes',
    bricksObstacle: 'Los obstáculos grises no se rompen; solo desvían la bola',
    powerupsTitle: 'Poderes',
    powerupsPierce: 'Perforar quita 3 golpes a cada ladrillo atravesado',
    powerupsMulti: 'Multibola y ráfaga se aplican a todas las bolas actuales',
    powerupsLimit: 'Puede haber hasta {{maxBalls}} bolas en pantalla',
    rulesTitle: 'Reglas',
    rulesLives: 'Cada nivel tiene 3 vidas; al perder una, continúa desde el popup',
    rulesClear: 'Rompe todos los ladrillos destruibles para superar el nivel',
    rulesSpeed: 'La velocidad de la bola aumenta suavemente durante la vida actual',
    rulesSave: 'El progreso y el récord se guardan en este navegador',
  },
  settings: {
    aria: 'Ajustes del juego',
    title: 'Ajustes del juego',
    subtitle: 'Ajusta el rendimiento y la intensidad del final de nivel.',
    maxBalls: 'Máximo de bolas en pantalla',
    brickSurge: 'Refuerzo de ladrillos',
    surgeModes: {
      off: {
        label: 'Desactivado',
        hint: 'No cambia los golpes restantes cuando sube el número de bolas.',
      },
      normal: {
        label: 'Refuerzo',
        hint: 'Con más de 25 bolas coexistiendo, los ladrillos restantes necesitan 30 golpes.',
      },
      super: {
        label: 'Súper refuerzo',
        hint: 'Después de superar 25 bolas coexistiendo, los ladrillos restantes necesitan 100 golpes y la pala queda al menos en nivel 3.',
      },
    },
  },
  modal: {
    passedTitle: 'Nivel {{level}} superado',
    failedTitle: 'Nivel fallido',
    lostLifeTitle: 'Bola perdida',
    pausedTitle: 'Pausa',
    passedDescription: 'El siguiente es el nivel {{nextLevel}}.',
    failedDescription:
      'No quedan vidas. Reintenta este nivel o vuelve al menú principal.',
    lostLifeDescription: 'Vidas restantes × {{lives}}',
    pausedDescription: 'El juego está en pausa. Continúa o vuelve al menú principal.',
  },
  powerups: {
    wide: 'Pala ancha',
    slow: 'Ralentizar',
    multi: 'Doble bola',
    pierce: 'Perforar',
    burst: 'Ráfaga de cinco',
  },
  canvas: {
    pause: 'Pausa',
  },
} satisfies TranslationResource;

export default translation;
