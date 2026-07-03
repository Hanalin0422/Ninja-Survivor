import {
  CANVAS_W,
  CANVAS_H,
  MAX_DT,
  MAX_WEAPONS,
  MAX_WEAPON_LEVEL,
  COLORS,
  GameState,
} from "./config/constants.js";

import {
  PASSIVE_DEFS,
  MINIMAP_SIZE,
  MINIMAP_MIN_SPAN,
  MINIMAP_PADDING,
  BEST_TIME_KEY,
  BEST_KILLS_KEY,
  PLAYER_SPRITE,
  ARROW_SPRITE,
  SLIME_SPRITE,
  BACKGROUND,
  SHURIKEN_SPRITE,
} from "./core/constants.js";

import {
  dist,
  normalize,
  circleOverlap,
  formatTime,
  worldToScreen,
  isOnScreen,
  getCooldownMult,
  xpToNext,
  pickRandomEnemies,
  shuffle,
} from "./core/utils.js";

import {
  damageEnemy,
  killEnemy,
  spawnEnemy,
  updateEnemies,
  configureEnemy,
} from "./entities/enemy.js";

import {
  canvas,
  ctx,
  minimapCanvas,
  minimapCtx,
  hud,
  hudControls,
  minimapWrap,
  menuOverlay,
  pauseOverlay,
  levelupOverlay,
  gameoverOverlay,
  pauseTime,
  pauseKills,
  hpBar,
  hpText,
  xpBar,
  xpText,
  levelDisplay,
  timeDisplay,
  killDisplay,
  levelupLevelText,
  upgradeCardsEl,
  gameoverTime,
  gameoverKills,
  gameoverLevel,
  pauseLevel,
  bestRecordMenu,
  bestRecordGameover,
  newRecordBadge,
  soundBtn,
  menuSoundBtn,
  keys,
  game,
} from "./core/state.js";

  // --- Input ---
  function clearKeys() {
    for (const code of Object.keys(keys)) {
      keys[code] = false;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (game.state === GameState.LEVEL_UP) {
      if (e.code === "Digit1") selectUpgrade(0);
      else if (e.code === "Digit2") selectUpgrade(1);
      else if (e.code === "Digit3") selectUpgrade(2);
      return;
    }

    if (e.code === "Escape" && !e.repeat) {
      e.preventDefault();
      if (game.state === GameState.PLAYING) {
        pauseGame();
      } else if (game.state === GameState.PAUSED) {
        resumeGame();
      }
      return;
    }

    if (game.state === GameState.PAUSED) return;

    keys[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (game.state === GameState.PAUSED || game.state === GameState.LEVEL_UP) return;
    keys[e.code] = false;
  });

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("restart-btn").addEventListener("click", startGame);
  document.getElementById("pause-btn").addEventListener("click", pauseGame);
  document.getElementById("resume-btn").addEventListener("click", resumeGame);
  document.getElementById("pause-restart-btn").addEventListener("click", startGame);
  soundBtn.addEventListener("click", toggleSound);
  menuSoundBtn.addEventListener("click", toggleSound);

  // --- Audio ---
  function initAudio() {
    if (!game.audioCtx) {
      game.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (game.audioCtx.state === "suspended") {
      game.audioCtx.resume();
    }
  }

  function toggleSound() {
    game.soundEnabled = !game.soundEnabled;
    updateSoundButtons();
    if (game.soundEnabled) initAudio();
  }

  function updateSoundButtons() {
    const label = game.soundEnabled ? "\uD83D\uDD0A" : "\uD83D\uDD07";
    soundBtn.textContent = label;
    soundBtn.classList.toggle("muted", !game.soundEnabled);
    menuSoundBtn.textContent = game.soundEnabled ? "\uD83D\uDD0A \uC0AC\uC6B4\uB4DC" : "\uD83D\uDD07 \uC0AC\uC6B4\uB4DC";
    menuSoundBtn.classList.toggle("muted", !game.soundEnabled);
  }

  function playTone(freq, duration, type, volume, freqEnd) {
    if (!game.soundEnabled || !game.audioCtx) return;
    const osc = game.audioCtx.createOscillator();
    const gain = game.audioCtx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, game.audioCtx.currentTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, game.audioCtx.currentTime + duration);
    }
    gain.gain.setValueAtTime(volume || 0.08, game.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, game.audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(game.audioCtx.destination);
    osc.start();
    osc.stop(game.audioCtx.currentTime + duration);
  }

  function playKillSound() {
    playTone(320, 0.08, "square", 0.06, 120);
  }

  function playPickupSound() {
    playTone(520, 0.06, "sine", 0.07, 880);
  }

  function playLevelUpSound() {
    if (!game.soundEnabled || !game.audioCtx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.12, "sine", 0.09), i * 80);
    });
  }

  function playDamageSound() {
    playTone(90, 0.15, "sawtooth", 0.1, 50);
  }

  function playGameOverSound() {
    if (!game.soundEnabled || !game.audioCtx) return;
    [392, 330, 262, 196].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.25, "triangle", 0.08), i * 180);
    });
  }

  // --- Particles ---
  function spawnDeathParticles(x, y) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      game.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        radius: 2 + Math.random() * 5,
        color: COLORS.enemy,
      });
    }
  }

  function spawnLevelUpParticles() {
    if (!game.player) return;
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      game.particles.push({
        x: game.player.x,
        y: game.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        radius: 3 + Math.random() * 4,
        color: i % 3 === 0 ? "#4ecca3" : i % 3 === 1 ? "#ffe66d" : "#00d9ff",
      });
    }
  }

  function spawnXpSparkle(x, y) {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      game.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.2 + Math.random() * 0.15,
        maxLife: 0.35,
        radius: 2 + Math.random() * 2,
        color: COLORS.gem,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) game.particles.splice(i, 1);
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      if (!isOnScreen(p.x, p.y, 30)) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      drawCircle(p.x, p.y, p.radius * alpha, p.color, alpha);
    }
  }

  // --- Difficulty ---
  function getDifficulty(elapsed) {
    const t = elapsed;
    let hpMult = 1;
    let speedMult = 1;
    let spawnMult = 1;
    let damageMult = 1;

    if (t < 60) {
      hpMult = 0.8;
      spawnMult = 0.65;
      speedMult = 0.9;
    } else if (t < 180) {
      const p = (t - 60) / 120;
      hpMult = 0.8 + p * 0.45;
      speedMult = 0.9 + p * 0.2;
      spawnMult = 0.65 + p * 0.7;
    } else {
      const extra = Math.floor((t - 180) / 120);
      hpMult = 1.25 + extra * 0.2;
      speedMult = 1.1 + Math.min((t - 180) / 300, 1) * 0.25;
      spawnMult = 1.35 + (t - 180) * 0.006;
      damageMult = 1 + extra * 0.12;
    }

    return { hpMult, speedMult, spawnMult, damageMult };
  }

  function getBestRecord() {
    const time = parseFloat(localStorage.getItem(BEST_TIME_KEY) || "0");
    const kills = parseInt(localStorage.getItem(BEST_KILLS_KEY) || "0", 10);
    return { time, kills };
  }

  function updateBestRecordDisplay() {
    const best = getBestRecord();
    if (best.time > 0) {
      bestRecordMenu.textContent = `\uCD5C\uACE0 \uAE30\uB85D: ${formatTime(best.time)} \u00B7 \uCC98\uCE58 ${best.kills}`;
      bestRecordMenu.classList.remove("hidden");
    } else {
      bestRecordMenu.classList.add("hidden");
    }
  }

  function loadPlayerSprite() {
    const img = new Image();
    img.onload = () => {
      PLAYER_SPRITE.image = img;
      PLAYER_SPRITE.loaded = true;
    };
    img.src = PLAYER_SPRITE.path;
  }

  function loadArrowSprite() {
    const img = new Image();
    img.onload = () => {
      ARROW_SPRITE.image = img;
      ARROW_SPRITE.loaded = true;
      ARROW_SPRITE.isSheet = img.width === 64 && img.height === 64;
      if (!ARROW_SPRITE.isSheet) {
        ARROW_SPRITE.frameW = img.width;
        ARROW_SPRITE.frameH = img.height;
      }
    };
    img.src = ARROW_SPRITE.path;
  }

  function loadSlimeSprite() {
    const img = new Image();
    img.onload = () => {
      SLIME_SPRITE.image = img;
      SLIME_SPRITE.loaded = true;
    };
    img.src = SLIME_SPRITE.path;
  }

  function loadBackground() {
    const img = new Image();
    img.onload = () => {
      BACKGROUND.image = img;
      BACKGROUND.loaded = true;
      BACKGROUND.tileW = img.width;
      BACKGROUND.tileH = img.height;
    };
    img.src = BACKGROUND.path;
  }

  function loadShurikenSprite() {
    const img = new Image();
    img.onload = () => {
      SHURIKEN_SPRITE.image = img;
      SHURIKEN_SPRITE.loaded = true;
      SHURIKEN_SPRITE.frameW = img.width;
      SHURIKEN_SPRITE.frameH = img.height;
    };
    img.src = SHURIKEN_SPRITE.path;
  }

  function getPlayerFacing(dx, dy, currentFacing) {
    if (dx === 0 && dy === 0) return currentFacing;
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? "right" : "left";
    }
    return dy > 0 ? "down" : "up";
  }

  function velocityToFacing(vx, vy) {
    if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001) return "right";
    return getPlayerFacing(vx, vy, "right");
  }

  // --- Weapons ---
  function createMagicArrow(level) {
    return {
      id: "magicArrow",
      name: "\uB9C8\uBC95 \uD654\uC0B4",
      level,
      cooldown: Math.max(0.35, 0.8 - (level - 1) * 0.1),
      timer: 0,
      damage: 25 + (level - 1) * 5,
      speed: 500 + (level - 1) * 20,
      radius: 6,
      projectileCount: 1 + Math.floor((level - 1) / 3),
      hitEnemies: new Set(),

      update(dt, p, enemyList, projList) {
        this.timer += dt;
        if (this.timer < this.cooldown * getCooldownMult(p)) return;
        if (enemyList.length === 0) return;

        const targets = [];
        const sorted = [...enemyList].sort(
          (a, b) => dist(p.x, p.y, a.x, a.y) - dist(p.x, p.y, b.x, b.y)
        );
        for (let i = 0; i < Math.min(this.projectileCount, sorted.length); i++) {
          targets.push(sorted[i]);
        }

        this.timer = 0;
        for (const target of targets) {
          const dir = normalize(target.x - p.x, target.y - p.y);
          projList.push({
            type: "magicArrow",
            x: p.x + dir.x * (p.radius + 4),
            y: p.y + dir.y * (p.radius + 4),
            vx: dir.x * this.speed,
            vy: dir.y * this.speed,
            facing: velocityToFacing(dir.x, dir.y),
            animFrame: 0,
            animTimer: 0,
            radius: 8,
            damage: this.damage,
            life: 2,
            pierce: Math.floor((this.level - 1) / 4),
          });
        }
      },
    };
  }

  function createScythe(level) {
    return {
      id: "scythe",
      name: "\uD68C\uC804 \uB0AB",
      level,
      orbitRadius: 55 + level * 8,
      rotationSpeed: 2.5 + level * 0.3,
      angle: 0,
      damage: 15 + level * 4,
      radius: 10 + level * 1.5,
      bladeCount: 1 + Math.floor((level - 1) / 2),
      hitTimers: new Map(),

      update(dt, p, enemyList) {
        this.angle += this.rotationSpeed * dt;

        for (let b = 0; b < this.bladeCount; b++) {
          const a = this.angle + (b / this.bladeCount) * Math.PI * 2;
          const bx = p.x + Math.cos(a) * this.orbitRadius;
          const by = p.y + Math.sin(a) * this.orbitRadius;

          for (const e of enemyList) {
            if (!circleOverlap(bx, by, this.radius, e.x, e.y, e.radius)) continue;
            const cd = this.hitTimers.get(e) || 0;
            if (cd > 0) continue;
            damageEnemy(e, this.damage);
            this.hitTimers.set(e, 0.35);
          }
        }

        for (const [enemy, cd] of this.hitTimers) {
          if (!enemyList.includes(enemy)) {
            this.hitTimers.delete(enemy);
          } else {
            this.hitTimers.set(enemy, cd - dt);
          }
        }
      },

      draw() {
        for (let b = 0; b < this.bladeCount; b++) {
          const a = this.angle + (b / this.bladeCount) * Math.PI * 2;
          const bx = game.player.x + Math.cos(a) * this.orbitRadius;
          const by = game.player.y + Math.sin(a) * this.orbitRadius;
          const s = worldToScreen(bx, by);

          if (SHURIKEN_SPRITE.loaded && SHURIKEN_SPRITE.image) {
            const { frameW, frameH, scale } = SHURIKEN_SPRITE;
            const drawW = frameW * scale;
            const drawH = frameH * scale;
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.rotate(this.angle * 4 + b * Math.PI * 2);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              SHURIKEN_SPRITE.image,
              -drawW / 2,
              -drawH / 2,
              drawW,
              drawH
            );
            ctx.restore();
          } else {
            ctx.fillStyle = COLORS.scythe;
            ctx.beginPath();
            ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(199, 125, 255, 0.6)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      },
    };
  }

  function createLightning(level) {
    return {
      id: "lightning",
      name: "\uBC88\uAC1C",
      level,
      cooldown: Math.max(0.6, 1.5 - (level - 1) * 0.1),
      timer: 0,
      damage: 30 + level * 8,
      targetCount: 1 + Math.floor((level - 1) / 2),
      splashRadius: 40 + level * 6,

      update(dt, p, enemyList) {
        this.timer += dt;
        if (this.timer < this.cooldown * getCooldownMult(p)) return;
        if (enemyList.length === 0) return;

        this.timer = 0;
        const targets = pickRandomEnemies(enemyList, this.targetCount);
        for (const t of targets) {
          damageEnemy(t, this.damage);
          game.lightningFlashes.push({ x: t.x, y: t.y, life: 0.3, maxLife: 0.3 });

          for (const e of enemyList) {
            if (e === t || e.hp <= 0) continue;
            if (dist(t.x, t.y, e.x, e.y) < this.splashRadius) {
              damageEnemy(e, this.damage * 0.4);
            }
          }
        }
      },
    };
  }

  const WEAPON_FACTORIES = {
    magicArrow: createMagicArrow,
    scythe: createScythe,
    lightning: createLightning,
  };

  const WEAPON_NAMES = {
    magicArrow: "\uB9C8\uBC95 \uD654\uC0B4",
    scythe: "\uD68C\uC804 \uB0AB",
    lightning: "\uBC88\uAC1C",
  };

  // --- Player ---
  function createPlayer() {
    return {
      x: 0,
      y: 0,
      radius: 16,
      speed: 300,
      hp: 100,
      maxHp: 100,
      invulnTimer: 0,
      level: 1,
      xp: 0,
      xpToNextLevel: xpToNext(1),
      pickupRadius: 80,
      cooldownReduction: 0,
      weapons: [createMagicArrow(1)],
      facing: "down",
      animFrame: 0,
      animTimer: 0,
      isMoving: false,
    };
  }

  function updatePlayer(dt) {
    let dx = 0;
    let dy = 0;
    if (keys.KeyW || keys.ArrowUp) dy -= 1;
    if (keys.KeyS || keys.ArrowDown) dy += 1;
    if (keys.KeyA || keys.ArrowLeft) dx -= 1;
    if (keys.KeyD || keys.ArrowRight) dx += 1;

    const dir = normalize(dx, dy);
    game.player.isMoving = dx !== 0 || dy !== 0;

    if (game.player.isMoving) {
      game.player.facing = getPlayerFacing(dx, dy, game.player.facing);
      game.player.animTimer += dt;
      const frameDuration = 1 / PLAYER_SPRITE.animFps;
      while (game.player.animTimer >= frameDuration) {
        game.player.animTimer -= frameDuration;
        game.player.animFrame = (game.player.animFrame + 1) % PLAYER_SPRITE.rows;
      }
    } else {
      game.player.animFrame = 0;
      game.player.animTimer = 0;
    }

    game.player.x += dir.x * game.player.speed * dt;
    game.player.y += dir.y * game.player.speed * dt;

    if (game.player.invulnTimer > 0) {
      game.player.invulnTimer -= dt;
    }

    for (const weapon of game.player.weapons) {
      weapon.update(dt, game.player, game.enemies, game.projectiles);
    }
  }

  // --- Pickups ---
  function createPickup(x, y, value) {
    return {
      x,
      y,
      radius: 7,
      value,
      magnetSpeed: 350,
    };
  }

  function updatePickups(dt) {
    for (let i = game.pickups.length - 1; i >= 0; i--) {
      const gem = game.pickups[i];
      const d = dist(game.player.x, game.player.y, gem.x, gem.y);

      if (d < game.player.pickupRadius) {
        const dir = normalize(game.player.x - gem.x, game.player.y - gem.y);
        const speed = gem.magnetSpeed + (game.player.pickupRadius - d) * 2;
        gem.x += dir.x * speed * dt;
        gem.y += dir.y * speed * dt;
      }

      if (circleOverlap(game.player.x, game.player.y, game.player.radius, gem.x, gem.y, gem.radius)) {
        spawnXpSparkle(gem.x, gem.y);
        playPickupSound();
        addXp(gem.value);
        game.pickups.splice(i, 1);
      }
    }
  }

  function addXp(amount) {
    game.player.xp += amount;
    if (game.player.xp >= game.player.xpToNextLevel) {
      game.player.xp -= game.player.xpToNextLevel;
      game.player.level++;
      game.player.xpToNextLevel = xpToNext(game.player.level);
      showLevelUp();
    }
  }

  // --- Projectiles ---
  function updateProjectiles(dt) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
      const p = game.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      if (p.type === "magicArrow") {
        p.animTimer += dt;
        const frameDuration = 1 / ARROW_SPRITE.animFps;
        while (p.animTimer >= frameDuration) {
          p.animTimer -= frameDuration;
          p.animFrame = (p.animFrame + 1) % ARROW_SPRITE.rows;
        }
      }

      if (p.life <= 0 || !isOnScreen(p.x, p.y, 100)) {
        game.projectiles.splice(i, 1);
        continue;
      }

      for (let j = game.enemies.length - 1; j >= 0; j--) {
        const e = game.enemies[j];
        if (!circleOverlap(p.x, p.y, p.radius, e.x, e.y, e.radius)) continue;

        if (!p.hitSet) p.hitSet = new Set();
        if (p.hitSet.has(e)) continue;

        damageEnemy(e, p.damage);
        p.hitSet.add(e);

        if (p.pierce > 0) {
          p.pierce--;
        } else {
          game.projectiles.splice(i, 1);
        }
        break;
      }
    }
  }

  // --- Upgrades ---
  function buildUpgradePool() {
    const pool = [];
    const ownedIds = new Set(game.player.weapons.map((w) => w.id));

    for (const id of Object.keys(WEAPON_FACTORIES)) {
      if (!ownedIds.has(id) && game.player.weapons.length < MAX_WEAPONS) {
        pool.push({
          type: "weapon_new",
          weaponId: id,
          title: `${WEAPON_NAMES[id]} \uD68D\uB4DD`,
          desc: "\uC0C8 \uBB34\uAE30\uB97C \uC7A5\uCC29\uD569\uB2C8\uB2E4",
        });
      }
    }

    for (const w of game.player.weapons) {
      if (w.level < MAX_WEAPON_LEVEL) {
        pool.push({
          type: "weapon_up",
          weaponId: w.id,
          title: `${WEAPON_NAMES[w.id]} Lv.${w.level + 1}`,
          desc: "\uBB34\uAE30\uB97C \uAC15\uD654\uD569\uB2C8\uB2E4",
        });
      }
    }

    for (const [id, def] of Object.entries(PASSIVE_DEFS)) {
      pool.push({
        type: "passive",
        passiveId: id,
        title: def.name,
        desc: def.desc,
      });
    }

    return pool;
  }

  function generateUpgradeOptions() {
    const pool = shuffle(buildUpgradePool());
    const options = [];
    const seen = new Set();

    for (const opt of pool) {
      const key = opt.type + ":" + (opt.weaponId || opt.passiveId);
      if (seen.has(key)) continue;
      seen.add(key);
      options.push(opt);
      if (options.length >= 3) break;
    }

    while (options.length < 3) {
      const ids = Object.keys(PASSIVE_DEFS);
      const id = ids[Math.floor(Math.random() * ids.length)];
      options.push({
        type: "passive",
        passiveId: id,
        title: PASSIVE_DEFS[id].name,
        desc: PASSIVE_DEFS[id].desc,
      });
    }

    return options.slice(0, 3);
  }

  function applyUpgrade(option) {
    if (option.type === "weapon_new") {
      game.player.weapons.push(WEAPON_FACTORIES[option.weaponId](1));
    } else if (option.type === "weapon_up") {
      const idx = game.player.weapons.findIndex((w) => w.id === option.weaponId);
      if (idx !== -1) {
        const newLevel = game.player.weapons[idx].level + 1;
        game.player.weapons[idx] = WEAPON_FACTORIES[option.weaponId](newLevel);
      }
    } else if (option.type === "passive") {
      PASSIVE_DEFS[option.passiveId].apply(game.player);
    }
  }

  function renderUpgradeCards() {
    upgradeCardsEl.innerHTML = "";
    game.currentUpgrades.forEach((opt, i) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "upgrade-card";
      card.innerHTML =
        `<span class="card-key">${i + 1}</span>` +
        `<div class="card-title">${opt.title}</div>` +
        `<div class="card-desc">${opt.desc}</div>`;
      card.addEventListener("click", () => selectUpgrade(i));
      upgradeCardsEl.appendChild(card);
    });
  }

  function showLevelUp() {
    game.state = GameState.LEVEL_UP;
    clearKeys();
    spawnLevelUpParticles();
    playLevelUpSound();
    game.currentUpgrades = generateUpgradeOptions();
    levelupLevelText.textContent = `Lv. ${game.player.level}`;
    renderUpgradeCards();
    levelupOverlay.classList.remove("hidden");
    hudControls.classList.add("hidden");
  }

  function selectUpgrade(index) {
    if (game.state !== GameState.LEVEL_UP) return;
    if (!game.currentUpgrades[index]) return;

    applyUpgrade(game.currentUpgrades[index]);
    levelupOverlay.classList.add("hidden");
    hudControls.classList.remove("hidden");
    game.state = GameState.PLAYING;
    clearKeys();
    game.lastTime = performance.now();
    updateHud();

    if (game.player.xp >= game.player.xpToNextLevel) {
      showLevelUp();
    }
  }

  // --- Spawn ---
  function updateSpawning(dt) {
    const diff = getDifficulty(game.survivalTime);
    const rate = 1.2 * (1 + game.survivalTime * 0.018) * diff.spawnMult;
    game.spawnTimer += dt;
    const interval = 1 / rate;
    while (game.spawnTimer >= interval) {
      game.spawnTimer -= interval;
      spawnEnemy();
      if (game.survivalTime > 60 && game.survivalTime < 180 && Math.random() < 0.22) {
        spawnEnemy();
      }
      if (game.survivalTime >= 180 && Math.random() < 0.12) {
        spawnEnemy();
      }
    }
  }

  function updateLightningFlashes(dt) {
    for (let i = game.lightningFlashes.length - 1; i >= 0; i--) {
      game.lightningFlashes[i].life -= dt;
      if (game.lightningFlashes[i].life <= 0) {
        game.lightningFlashes.splice(i, 1);
      }
    }
  }

  // --- Camera ---
  function updateCamera() {
    game.camera.x = game.player.x;
    game.camera.y = game.player.y;
  }

  // --- Render ---
  function drawBackground() {
    if (!BACKGROUND.loaded || !BACKGROUND.image) {
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      return;
    }

    const { tileW, tileH, image } = BACKGROUND;
    const startX = Math.floor((game.camera.x - CANVAS_W / 2) / tileW) * tileW;
    const startY = Math.floor((game.camera.y - CANVAS_H / 2) / tileH) * tileH;
    const endX = game.camera.x + CANVAS_W / 2 + tileW;
    const endY = game.camera.y + CANVAS_H / 2 + tileH;

    ctx.imageSmoothingEnabled = false;
    for (let wx = startX; wx < endX; wx += tileW) {
      for (let wy = startY; wy < endY; wy += tileH) {
        const sx = wx - game.camera.x + CANVAS_W / 2;
        const sy = wy - game.camera.y + CANVAS_H / 2;
        if (sx + tileW < 0 || sx > CANVAS_W || sy + tileH < 0 || sy > CANVAS_H) continue;
        ctx.drawImage(image, sx, sy, tileW, tileH);
      }
    }
  }

  function drawCircle(wx, wy, radius, color, alpha) {
    const s = worldToScreen(wx, wy);
    ctx.globalAlpha = alpha !== undefined ? alpha : 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawPickups() {
    for (const gem of game.pickups) {
      if (!isOnScreen(gem.x, gem.y, 20)) continue;
      const s = worldToScreen(gem.x, gem.y);
      const pulse = 1 + Math.sin(game.survivalTime * 8 + gem.x) * 0.15;
      ctx.fillStyle = COLORS.gem;
      ctx.beginPath();
      ctx.arc(s.x, s.y, gem.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 217, 255, 0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawSlimeEnemy(e) {
    const s = worldToScreen(e.x, e.y);

    if (!SLIME_SPRITE.loaded || !SLIME_SPRITE.image) {
      drawCircle(e.x, e.y, e.radius, COLORS.enemy);
      return e.radius;
    }

    const col = SLIME_SPRITE.dirCol[e.facing];
    const row = e.animFrame % SLIME_SPRITE.rows;
    const { frameW, frameH, scale } = SLIME_SPRITE;
    const drawW = frameW * scale;
    const drawH = frameH * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      SLIME_SPRITE.image,
      col * frameW,
      row * frameH,
      frameW,
      frameH,
      s.x - drawW / 2,
      s.y - drawH / 2,
      drawW,
      drawH
    );

    return drawH / 2;
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      if (!isOnScreen(e.x, e.y, e.radius + 24)) continue;

      const halfH = drawSlimeEnemy(e);
      const s = worldToScreen(e.x, e.y);
      const barW = e.radius * 2;
      const hpRatio = e.hp / e.maxHp;
      const barY = s.y - halfH - 6;

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(s.x - barW / 2, barY, barW, 4);
      ctx.fillStyle = "#ff6b6b";
      ctx.fillRect(s.x - barW / 2, barY, barW * hpRatio, 4);
    }
  }

  function drawMagicArrowProjectile(p) {
    const s = worldToScreen(p.x, p.y);

    if (!ARROW_SPRITE.loaded || !ARROW_SPRITE.image) {
      drawCircle(p.x, p.y, p.radius, COLORS.projectile);
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (ARROW_SPRITE.isSheet) {
      const facing = p.facing || velocityToFacing(p.vx, p.vy);
      const col = ARROW_SPRITE.dirCol[facing];
      const row = p.animFrame % ARROW_SPRITE.rows;
      const { frameW, frameH, scale } = ARROW_SPRITE;
      const drawW = frameW * scale;
      const drawH = frameH * scale;
      ctx.drawImage(
        ARROW_SPRITE.image,
        col * frameW,
        row * frameH,
        frameW,
        frameH,
        s.x - drawW / 2,
        s.y - drawH / 2,
        drawW,
        drawH
      );
    } else {
      const angle = Math.atan2(p.vy, p.vx);
      const pulse = 1 + Math.sin(p.animFrame * Math.PI / 2) * 0.1;
      const scale = ARROW_SPRITE.singleScale * pulse;
      const drawW = ARROW_SPRITE.frameW * scale;
      const drawH = ARROW_SPRITE.frameH * scale;
      ctx.translate(s.x, s.y);
      ctx.rotate(angle);
      ctx.drawImage(ARROW_SPRITE.image, -drawW / 2, -drawH / 2, drawW, drawH);
    }

    ctx.restore();
  }

  function drawProjectiles() {
    for (const p of game.projectiles) {
      if (!isOnScreen(p.x, p.y, p.radius + 16)) continue;
      if (p.type === "magicArrow") {
        drawMagicArrowProjectile(p);
      } else {
        drawCircle(p.x, p.y, p.radius, COLORS.projectile);
      }
    }
  }

  function drawLightningFlashes() {
    for (const flash of game.lightningFlashes) {
      const s = worldToScreen(flash.x, flash.y);
      const alpha = flash.life / flash.maxLife;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COLORS.lightning;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 30);
      ctx.lineTo(s.x - 10, s.y - 10);
      ctx.lineTo(s.x + 8, s.y);
      ctx.lineTo(s.x - 6, s.y + 15);
      ctx.lineTo(s.x, s.y + 35);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255, 245, 157, 0.4)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 25 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWeapons() {
    for (const weapon of game.player.weapons) {
      if (weapon.draw) weapon.draw();
    }
  }

  function drawPlayer() {
    const blink = game.player.invulnTimer > 0 && Math.floor(game.player.invulnTimer * 10) % 2 === 0;
    const s = worldToScreen(game.player.x, game.player.y);

    if (PLAYER_SPRITE.loaded && PLAYER_SPRITE.image) {
      const col = PLAYER_SPRITE.dirCol[game.player.facing];
      const row = game.player.isMoving ? game.player.animFrame : 0;
      const { frameW, frameH, scale } = PLAYER_SPRITE;
      const drawW = frameW * scale;
      const drawH = frameH * scale;

      ctx.save();
      ctx.globalAlpha = blink ? 0.45 : 1;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        PLAYER_SPRITE.image,
        col * frameW,
        row * frameH,
        frameW,
        frameH,
        s.x - drawW / 2,
        s.y - drawH / 2,
        drawW,
        drawH
      );
      ctx.restore();
    } else {
      drawCircle(game.player.x, game.player.y, game.player.radius, COLORS.player, blink ? 0.4 : 1);
    }

    ctx.strokeStyle = "rgba(0, 217, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, game.player.pickupRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawMinimap() {
    if (!game.player) return;

    let minX = game.player.x;
    let maxX = game.player.x;
    let minY = game.player.y;
    let maxY = game.player.y;

    for (const gem of game.pickups) {
      minX = Math.min(minX, gem.x);
      maxX = Math.max(maxX, gem.x);
      minY = Math.min(minY, gem.y);
      maxY = Math.max(maxY, gem.y);
    }

    const spanX = Math.max(maxX - minX, MINIMAP_MIN_SPAN);
    const spanY = Math.max(maxY - minY, MINIMAP_MIN_SPAN);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    minX = cx - spanX / 2 - MINIMAP_PADDING;
    maxX = cx + spanX / 2 + MINIMAP_PADDING;
    minY = cy - spanY / 2 - MINIMAP_PADDING;
    maxY = cy + spanY / 2 + MINIMAP_PADDING;

    const worldW = maxX - minX;
    const worldH = maxY - minY;

    minimapCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    minimapCtx.fillStyle = "rgba(15, 15, 26, 0.92)";
    minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    minimapCtx.strokeStyle = "rgba(37, 37, 69, 0.8)";
    minimapCtx.lineWidth = 1;
    const gridStep = MINIMAP_SIZE / 4;
    for (let i = 1; i < 4; i++) {
      minimapCtx.beginPath();
      minimapCtx.moveTo(i * gridStep, 0);
      minimapCtx.lineTo(i * gridStep, MINIMAP_SIZE);
      minimapCtx.stroke();
      minimapCtx.beginPath();
      minimapCtx.moveTo(0, i * gridStep);
      minimapCtx.lineTo(MINIMAP_SIZE, i * gridStep);
      minimapCtx.stroke();
    }

    function worldToMinimap(wx, wy) {
      return {
        x: ((wx - minX) / worldW) * MINIMAP_SIZE,
        y: ((wy - minY) / worldH) * MINIMAP_SIZE,
      };
    }

    for (const gem of game.pickups) {
      const p = worldToMinimap(gem.x, gem.y);
      minimapCtx.fillStyle = COLORS.gem;
      minimapCtx.beginPath();
      minimapCtx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    const pp = worldToMinimap(game.player.x, game.player.y);
    minimapCtx.fillStyle = COLORS.player;
    minimapCtx.beginPath();
    minimapCtx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.strokeStyle = "rgba(78, 204, 163, 0.8)";
    minimapCtx.lineWidth = 1.5;
    minimapCtx.stroke();
  }

  function render() {
    drawBackground();
    drawPickups();
    drawEnemies();
    drawProjectiles();
    drawParticles();
    drawLightningFlashes();
    drawPlayer();
    drawWeapons();
    drawMinimap();
  }

  // --- HUD ---
  function updateHud() {
    const hpRatio = game.player.hp / game.player.maxHp;
    hpBar.style.width = `${hpRatio * 100}%`;
    hpText.textContent = `${Math.ceil(game.player.hp)} / ${game.player.maxHp}`;

    const xpRatio = game.player.xp / game.player.xpToNextLevel;
    xpBar.style.width = `${xpRatio * 100}%`;
    xpText.textContent = `${Math.floor(game.player.xp)} / ${game.player.xpToNextLevel}`;
    levelDisplay.textContent = String(game.player.level);

    timeDisplay.textContent = formatTime(game.survivalTime);
    killDisplay.textContent = `\uCC98\uCE58: ${game.killCount}`;
  }

  // --- Game flow ---
  function startGame() {
    initAudio();
    clearKeys();
    game.player = createPlayer();
    game.enemies = [];
    game.projectiles = [];
    game.pickups = [];
    game.particles = [];
    game.lightningFlashes = [];
    game.camera = { x: 0, y: 0 };
    game.survivalTime = 0;
    game.killCount = 0;
    game.spawnTimer = 0;
    game.currentUpgrades = [];
    game.state = GameState.PLAYING;

    menuOverlay.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    levelupOverlay.classList.add("hidden");
    gameoverOverlay.classList.add("hidden");
    hud.classList.remove("hidden");
    hudControls.classList.remove("hidden");
    minimapWrap.classList.remove("hidden");

    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }

  function pauseGame() {
    if (game.state !== GameState.PLAYING) return;
    game.state = GameState.PAUSED;
    clearKeys();
    pauseTime.textContent = formatTime(game.survivalTime);
    pauseKills.textContent = String(game.killCount);
    pauseLevel.textContent = String(game.player.level);
    pauseOverlay.classList.remove("hidden");
  }

  function resumeGame() {
    if (game.state !== GameState.PAUSED) return;
    game.state = GameState.PLAYING;
    pauseOverlay.classList.add("hidden");
    clearKeys();
    game.lastTime = performance.now();
  }

  function endGame() {
    game.state = GameState.GAME_OVER;
    clearKeys();
    playGameOverSound();

    const best = getBestRecord();
    const isNewRecord = game.survivalTime > best.time;
    if (isNewRecord) {
      localStorage.setItem(BEST_TIME_KEY, String(game.survivalTime));
      localStorage.setItem(BEST_KILLS_KEY, String(game.killCount));
    }

    gameoverTime.textContent = formatTime(game.survivalTime);
    gameoverKills.textContent = String(game.killCount);
    gameoverLevel.textContent = String(game.player.level);

    const updatedBest = getBestRecord();
    bestRecordGameover.textContent = `\uCD5C\uACE0 \uAE30\uB85D: ${formatTime(updatedBest.time)} \u00B7 \uCC98\uCE58 ${updatedBest.kills}`;
    newRecordBadge.classList.toggle("hidden", !isNewRecord);

    hud.classList.add("hidden");
    hudControls.classList.add("hidden");
    minimapWrap.classList.add("hidden");
    pauseOverlay.classList.add("hidden");
    levelupOverlay.classList.add("hidden");
    gameoverOverlay.classList.remove("hidden");
  }

  function update(dt) {
    if (game.state !== GameState.PLAYING) return;

    game.survivalTime += dt;
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updatePickups(dt);
    updateLightningFlashes(dt);
    updateParticles(dt);
    updateSpawning(dt);
    updateCamera();
    updateHud();
  }

  function gameLoop(timestamp) {
    if (game.state === GameState.PLAYING) {
      let dt = (timestamp - game.lastTime) / 1000;
      game.lastTime = timestamp;
      if (dt > MAX_DT) dt = MAX_DT;
      update(dt);
      render();
      requestAnimationFrame(gameLoop);
    } else if (game.state === GameState.PAUSED) {
      render();
      requestAnimationFrame(gameLoop);
    } else if (game.state === GameState.LEVEL_UP) {
      let dt = (timestamp - game.lastTime) / 1000;
      game.lastTime = timestamp;
      if (dt > MAX_DT) dt = MAX_DT;
      updateParticles(dt);
      render();
      requestAnimationFrame(gameLoop);
    } else if (game.state === GameState.GAME_OVER) {
      render();
    }
  }

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  configureEnemy({
    getDifficulty,
    getFacing: getPlayerFacing,
    onEnemyKilled(enemy) {
      spawnDeathParticles(enemy.x, enemy.y);
      game.pickups.push(createPickup(enemy.x, enemy.y, enemy.xpValue));
      playKillSound();
    },
    playDamageSound,
    endGame,
  });

  loadPlayerSprite();
  loadArrowSprite();
  loadSlimeSprite();
  loadBackground();
  loadShurikenSprite();
  updateSoundButtons();
  updateBestRecordDisplay();
