export const PASSIVE_DEFS = {
  maxHp: {
    name: "최대 HP",
    desc: "최대 HP +20, 즉시 회복",
    apply(p) {
      p.maxHp += 20;
      p.hp = Math.min(p.hp + 20, p.maxHp);
    },
  },
  speed: {
    name: "이동 속도",
    desc: "이동 속도 +10%",
    apply(p) {
      p.speed *= 1.1;
    },
  },
  pickup: {
    name: "픽업 범위",
    desc: "경험치 흡수 범위 +35",
    apply(p) {
      p.pickupRadius += 35;
    },
  },
  cooldown: {
    name: "쿨다운 감소",
    desc: "모든 무기 쿨다운 -8%",
    apply(p) {
      p.cooldownReduction = Math.min(p.cooldownReduction + 0.08, 0.5);
    },
  },
};

export const MINIMAP_SIZE = 140;
export const MINIMAP_MIN_SPAN = 600;
export const MINIMAP_PADDING = 80;
export const BEST_TIME_KEY = "survivor_best_time";
export const BEST_KILLS_KEY = "survivor_best_kills";

export const PLAYER_SPRITE = {
  path: "image/sprite-ninja.png",
  image: null,
  loaded: false,
  frameW: 16,
  frameH: 16,
  cols: 4,
  rows: 4,
  scale: 2,
  animFps: 8,
  dirCol: { down: 0, up: 1, left: 2, right: 3 },
};

export const ARROW_SPRITE = {
  path: "image/arrow.png",
  image: null,
  loaded: false,
  isSheet: false,
  frameW: 16,
  frameH: 16,
  cols: 4,
  rows: 4,
  scale: 2,
  singleScale: 3,
  animFps: 12,
  dirCol: { down: 0, up: 1, left: 2, right: 3 },
};

export const SLIME_SPRITE = {
  path: "image/sprite-slime.png",
  image: null,
  loaded: false,
  frameW: 16,
  frameH: 16,
  cols: 4,
  rows: 4,
  scale: 2,
  animFps: 6,
  dirCol: { down: 0, up: 1, left: 2, right: 3 },
};

export const BACKGROUND = {
  path: "image/background.png",
  image: null,
  loaded: false,
  tileW: 1024,
  tileH: 1024,
};

export const SHURIKEN_SPRITE = {
  path: "image/shuriken.png",
  image: null,
  loaded: false,
  frameW: 15,
  frameH: 15,
  scale: 2.5,
};
