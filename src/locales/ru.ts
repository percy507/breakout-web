import type { TranslationResource } from './en';

const translation = {
  app: {
    eyebrow: 'NEON BREAKOUT',
    title: 'Neon Breakout',
    mute: 'Без звука',
    unmute: 'Включить звук',
    resetConfirm: 'Сбросить прогресс уровней и лучший счёт?',
  },
  stats: {
    level: 'Уровень',
    lives: 'Жизни',
    score: 'Счёт',
    bestScore: 'Рекорд',
    highestUnlocked: 'Макс. уровень',
    ballCount: 'Шары',
  },
  status: {
    ready: 'Начните, когда готовы',
    aiming: 'Прицельтесь и запускайте',
    playing: 'Игра',
    paused: 'Пауза',
    lifeLost: 'Жизнь потеряна',
    levelClear: 'Уровень пройден',
    gameOver: 'Попробуйте снова',
  },
  actions: {
    start: 'Старт',
    continue: 'Продолжить',
    fire: 'Запуск',
    help: 'Помощь',
    close: 'Закрыть',
    nextLevel: 'Следующий уровень',
    retry: 'Повторить',
    resetProgress: 'Сбросить',
    backToMenu: 'Главное меню',
  },
  menu: {
    subtitle: 'Разбивайте кирпичи, ловите бонусы и проходите уровень.',
  },
  help: {
    aria: 'Помощь по игре',
    intro:
      'Сначала прицельтесь. Пока вы целитесь, платформа не двигается. Двигайте мышь или тяните, чтобы настроить угол, затем щёлкните ещё раз или отпустите, чтобы запустить шар.',
    powerSeparator: ', ',
    activePowers: 'Активно: {{powers}}',
    inactivePowers: 'Бонусы: расширение, замедление, мультишар, пробитие, веер',
    controlsTitle: 'Управление',
    controlsPc: 'ПК: двигайте мышь для прицеливания, затем управляйте платформой мышью',
    controlsMobile:
      'Мобильный: тяните для прицеливания, затем тяните для управления платформой',
    controlsPause: 'В игре: Esc, P, Пробел или кнопка справа сверху ставят паузу',
    bricksTitle: 'Кирпичи',
    bricksNormal: 'Обычные кирпичи ломаются за 1 удар; прочные выдерживают до 12',
    bricksNumber: 'Число на кирпиче показывает оставшиеся удары',
    bricksObstacle: 'Серые препятствия не ломаются; они только меняют направление шара',
    powerupsTitle: 'Бонусы',
    powerupsPierce: 'Пробитие снимает 3 удара с каждого пройденного кирпича',
    powerupsMulti: 'Мультишар и веер действуют на все текущие шары',
    powerupsLimit: 'На экране может быть до 100 шаров',
    rulesTitle: 'Правила',
    rulesLives: 'На каждом уровне 3 жизни; после потери можно продолжить из окна',
    rulesClear: 'Разбейте все разрушаемые кирпичи, чтобы пройти уровень',
    rulesSpeed: 'Скорость шара плавно растёт в течение текущей жизни',
    rulesSave: 'Прогресс и рекорд сохраняются в этом браузере',
  },
  modal: {
    passedTitle: 'Уровень {{level}} пройден',
    failedTitle: 'Уровень провален',
    lostLifeTitle: 'Шар потерян',
    pausedTitle: 'Пауза',
    passedDescription: 'Следующий — уровень {{nextLevel}}.',
    failedDescription:
      'Жизней не осталось. Повторите уровень или вернитесь в главное меню.',
    lostLifeDescription: 'Осталось жизней × {{lives}}',
    pausedDescription: 'Игра на паузе. Продолжите или вернитесь в главное меню.',
  },
  powerups: {
    wide: 'Широкая платформа',
    slow: 'Замедление',
    multi: 'Двойной шар',
    pierce: 'Пробитие',
    burst: 'Веер из пяти',
  },
  canvas: {
    pause: 'Пауза',
  },
} satisfies TranslationResource;

export default translation;
