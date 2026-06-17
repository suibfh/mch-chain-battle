import { CONFIG } from './config.js';

export function createInitialHero() {
  return {
    maxHp: CONFIG.hero.maxHp,
    hp: CONFIG.hero.initialHp,
    baseAttack: CONFIG.hero.baseAttack,
    phy: 0,
    int: 0,
    attackInterval: CONFIG.hero.initialAttackInterval,
    attackTimer: 0,
  };
}

export function createBoss(level) {
  const maxHp = CONFIG.boss.baseHp + level * CONFIG.boss.hpPerLevel + level * level * CONFIG.boss.hpLevelSquare;
  return {
    level,
    maxHp,
    hp: maxHp,
    attack: CONFIG.boss.baseAttack + level * CONFIG.boss.attackPerLevel,
    attackInterval: Math.max(
      CONFIG.boss.minAttackInterval,
      CONFIG.boss.baseAttackInterval - level * CONFIG.boss.attackIntervalPerLevel,
    ),
    attackTimer: 0,
    imageIndex: ((level - 1) % CONFIG.boss.imageCount) + 1,
    powerTier: Math.floor((level - 1) / CONFIG.boss.imageCount),
  };
}

export function getHeroAttack(hero) {
  return hero.baseAttack + hero.phy + hero.int;
}

export function applyGrowth(hero, type, clearedCount, chainCount) {
  const growthValue = clearedCount + chainCount;
  const messages = [];

  if (type === 'HP') {
    const maxUp = growthValue * CONFIG.growth.hpMaxIncreaseMultiplier;
    const heal = growthValue * CONFIG.growth.hpHealMultiplier;
    hero.maxHp += maxUp;
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    messages.push(`HP +${heal.toFixed(0)} / MaxHP +${maxUp.toFixed(0)}`);
  }

  if (type === 'PHY') {
    const up = growthValue * CONFIG.growth.phyMultiplier;
    hero.phy += up;
    messages.push(`PHY +${up.toFixed(1)}`);
  }

  if (type === 'INT') {
    const up = growthValue * CONFIG.growth.intMultiplier;
    hero.int += up;
    messages.push(`INT +${up.toFixed(1)}`);
  }

  if (type === 'AGI') {
    const down = growthValue * CONFIG.growth.agiIntervalReduction;
    hero.attackInterval = Math.max(CONFIG.hero.minAttackInterval, hero.attackInterval - down);
    messages.push(`AGI interval -${down.toFixed(2)}s`);
  }

  return messages;
}

export function getFallIntervalByBossLevel(level) {
  return Math.max(
    CONFIG.board.minFallInterval,
    CONFIG.board.initialFallInterval - level * CONFIG.board.fallIntervalPerBossLevel,
  );
}
