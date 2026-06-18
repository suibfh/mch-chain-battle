export const CONFIG = {
  game: {
    title: 'MCH Chain Battle',
    timeLimitSec: 180,
    tickMs: 1000 / 60,
    fullTimeResultLabel: 'FULL TIME CLEAR',
  },

  board: {
    width: 6,
    height: 12,
    eraseCount: 4,
    initialFallInterval: 1.0,
    minFallInterval: 0.25,
    fallIntervalPerBossLevel: 0.04,
  },

  hero: {
    maxHp: 100,
    initialHp: 100,
    baseAttack: 8,
    initialAttackInterval: 1.0,
    minAttackInterval: 0.7,
  },

  boss: {
    imageCount: 15,
    baseHp: 80,
    hpPerLevel: 30,
    hpLevelSquare: 3,
    baseAttack: 6,
    attackPerLevel: 1.5,
    baseAttackInterval: 4.0,
    minAttackInterval: 2.4,
    attackIntervalPerLevel: 0.015,
  },

  growth: {
    hpHealMultiplier: 8,
    hpMaxIncreaseMultiplier: 1.5,
    phyMultiplier: 0.6,
    intMultiplier: 0.6,
    agiIntervalReduction: 0.03,
  },

  effects: {
    clearDelayMs: 180,
    afterClearDelayMs: 70,
  },

  score: {
    clearBase: 100,
    chainBonus: 300,
    bossDefeatBase: 1000,
    survivalBonusPerSecond: 5,
  },

  ui: {
    touchButtonOrder: ['left', 'drop', 'rotate', 'right'],
    touchButtons: {
      left: '◀',
      right: '▶',
      rotate: '↻',
      drop: 'DROP',
    },
  },

  images: {
    hero: './assets/images/hero/hero.png',
    bossDir: './assets/images/boss',
    bossPrefix: 'boss_',
    bossExt: 'png',
    background: './assets/images/ui/background.png',
  },

  audio: {
    enabled: true,
    bgmVolume: 0.4,
    seVolume: 0.7,
    muted: false,
    files: {
      bgm: './assets/audio/bgm.mp3',
      damage: './assets/audio/damage.mp3',
      bossDefeat: './assets/audio/boss_defeat.mp3',
      gameOver: './assets/audio/win.mp3',
      clear: './assets/audio/clear.mp3',
      win: './assets/audio/win.mp3',
    },
  },

  supabase: {
    // Supabase接続後に以下2つを設定してください。
    // url: 'https://xxxx.supabase.co',
    // anonKey: 'public-anon-key',
    url: '',
    anonKey: '',
    table: 'rankings',
  },


  types: {
    HP: {
      label: 'HP',
      name: 'MCHアーマー',
      color: '#42d392',
      text: 'HP',
      asset: './assets/images/extension/hp.png',
    },
    PHY: {
      label: 'PHY',
      name: 'へし切長谷部',
      color: '#ff5c5c',
      text: 'PH',
      asset: './assets/images/extension/phy.png',
    },
    INT: {
      label: 'INT',
      name: 'メギド',
      color: '#9b7bff',
      text: 'IN',
      asset: './assets/images/extension/int.png',
    },
    AGI: {
      label: 'AGI',
      name: 'コボルドのブーツ',
      color: '#4bb7ff',
      text: 'AG',
      asset: './assets/images/extension/agi.png',
    },
  },
};

export const TYPE_KEYS = Object.keys(CONFIG.types);
