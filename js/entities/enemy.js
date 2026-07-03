import { CANVAS_W, CANVAS_H } from "../config/constants.js";
import { SLIME_SPRITE } from "../core/constants.js";
import { game } from "../core/state.js";
import { dist, normalize, circleOverlap } from "../core/utils.js";

const deps = {
  getDifficulty: () => ({ hpMult: 1, speedMult: 1, spawnMult: 1, damageMult: 1 }),
  getFacing: (dx, dy, current) => current,
  onEnemyKilled: null,
  playDamageSound: null,
  endGame: null,
};

/** Wire game.js callbacks (pickup, particles, audio, difficulty, facing). */
export function configureEnemy(hooks) {
  Object.assign(deps, hooks);
}

export function createEnemy(x, y, elapsed) {
  const diff = deps.getDifficulty(elapsed);
  const baseHp = 30 * diff.hpMult;
  const baseSpeed = 80 * diff.speedMult;
  return {
    x,
    y,
    radius: 14,
    hp: baseHp,
    maxHp: baseHp,
    speed: baseSpeed,
    damage: Math.round(10 * diff.damageMult),
    contactCooldown: 0,
    xpValue: 10,
    facing: "down",
    animFrame: 0,
    animTimer: 0,
  };
}

export function damageEnemy(enemy, damage) {
  if (!enemy || enemy.hp <= 0) return;
  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

export function killEnemy(enemy) {
  const idx = game.enemies.indexOf(enemy);
  if (idx === -1) return;
  deps.onEnemyKilled?.(enemy);
  game.enemies.splice(idx, 1);
  game.killCount++;
}

export function spawnEnemy() {
  if (game.enemies.length >= 400) return;

  const margin = 80;
  const minDist = Math.max(CANVAS_W, CANVAS_H) / 2 + margin;
  const maxDist = minDist + 120;
  const angle = Math.random() * Math.PI * 2;
  const spawnDist = minDist + Math.random() * (maxDist - minDist);

  const x = game.player.x + Math.cos(angle) * spawnDist;
  const y = game.player.y + Math.sin(angle) * spawnDist;

  game.enemies.push(createEnemy(x, y, game.survivalTime));
}

export function updateEnemies(dt) {
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    const dir = normalize(game.player.x - e.x, game.player.y - e.y);
    e.x += dir.x * e.speed * dt;
    e.y += dir.y * e.speed * dt;

    if (dir.x !== 0 || dir.y !== 0) {
      e.facing = deps.getFacing(dir.x, dir.y, e.facing);
      e.animTimer += dt;
      const frameDuration = 1 / SLIME_SPRITE.animFps;
      while (e.animTimer >= frameDuration) {
        e.animTimer -= frameDuration;
        e.animFrame = (e.animFrame + 1) % SLIME_SPRITE.rows;
      }
    }

    if (e.contactCooldown > 0) {
      e.contactCooldown -= dt;
    }

    if (circleOverlap(game.player.x, game.player.y, game.player.radius, e.x, e.y, e.radius)) {
      if (game.player.invulnTimer <= 0 && e.contactCooldown <= 0) {
        game.player.hp -= e.damage;
        game.player.invulnTimer = 0.5;
        e.contactCooldown = 0.8;
        deps.playDamageSound?.();
        if (game.player.hp <= 0) {
          game.player.hp = 0;
          deps.endGame?.();
          return;
        }
      }
    }

    for (let j = i + 1; j < game.enemies.length; j++) {
      const other = game.enemies[j];
      const d = dist(e.x, e.y, other.x, other.y);
      const minSep = e.radius + other.radius;
      if (d < minSep && d > 0.001) {
        const overlap = (minSep - d) * 0.25;
        const nx = (e.x - other.x) / d;
        const ny = (e.y - other.y) / d;
        e.x += nx * overlap;
        e.y += ny * overlap;
        other.x -= nx * overlap;
        other.y -= ny * overlap;
      }
    }
  }
}
