import { GameState } from "../config/constants.js";

// --- Canvas ---
export const canvas = document.getElementById("game-canvas");
export const ctx = canvas.getContext("2d");
export const minimapCanvas = document.getElementById("minimap-canvas");
export const minimapCtx = minimapCanvas.getContext("2d");

// --- DOM refs ---
export const hud = document.getElementById("hud");
export const hudControls = document.getElementById("hud-controls");
export const minimapWrap = document.getElementById("minimap-wrap");
export const menuOverlay = document.getElementById("menu-overlay");
export const pauseOverlay = document.getElementById("pause-overlay");
export const levelupOverlay = document.getElementById("levelup-overlay");
export const gameoverOverlay = document.getElementById("gameover-overlay");
export const pauseTime = document.getElementById("pause-time");
export const pauseKills = document.getElementById("pause-kills");
export const hpBar = document.getElementById("hp-bar");
export const hpText = document.getElementById("hp-text");
export const xpBar = document.getElementById("xp-bar");
export const xpText = document.getElementById("xp-text");
export const levelDisplay = document.getElementById("level-display");
export const timeDisplay = document.getElementById("time-display");
export const killDisplay = document.getElementById("kill-display");
export const levelupLevelText = document.getElementById("levelup-level-text");
export const upgradeCardsEl = document.getElementById("upgrade-cards");
export const gameoverTime = document.getElementById("gameover-time");
export const gameoverKills = document.getElementById("gameover-kills");
export const gameoverLevel = document.getElementById("gameover-level");
export const pauseLevel = document.getElementById("pause-level");
export const bestRecordMenu = document.getElementById("best-record-menu");
export const bestRecordGameover = document.getElementById("best-record-gameover");
export const newRecordBadge = document.getElementById("new-record-badge");
export const soundBtn = document.getElementById("sound-btn");
export const menuSoundBtn = document.getElementById("menu-sound-btn");

// --- Input (mutable object; property writes are allowed from importers) ---
export const keys = {};

/**
 * Shared runtime state. Importing modules must mutate via `game.xxx = …`
 * (direct `import { state }` reassignment is not allowed in ES modules).
 */
export const game = {
  state: GameState.MENU,
  player: null,
  enemies: [],
  projectiles: [],
  pickups: [],
  particles: [],
  lightningFlashes: [],
  camera: { x: 0, y: 0 },
  survivalTime: 0,
  killCount: 0,
  spawnTimer: 0,
  lastTime: 0,
  currentUpgrades: [],
  soundEnabled: true,
  audioCtx: null,
};
