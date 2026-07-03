import { CANVAS_W, CANVAS_H } from "../config/constants.js";
import { game } from "./state.js";

export function dist(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}

export function circleOverlap(ax, ay, ar, bx, by, br) {
  return dist(ax, ay, bx, by) < ar + br;
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function worldToScreen(wx, wy) {
  return {
    x: wx - game.camera.x + CANVAS_W / 2,
    y: wy - game.camera.y + CANVAS_H / 2,
  };
}

export function isOnScreen(wx, wy, margin) {
  const m = margin || 0;
  const sx = wx - game.camera.x + CANVAS_W / 2;
  const sy = wy - game.camera.y + CANVAS_H / 2;
  return sx > -m && sx < CANVAS_W + m && sy > -m && sy < CANVAS_H + m;
}

export function getCooldownMult(p) {
  return 1 - (p.cooldownReduction || 0);
}

export function xpToNext(level) {
  return Math.floor(100 * Math.pow(1.1, level - 1));
}

export function pickRandomEnemies(list, count) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(count, copy.length));
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
