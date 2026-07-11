"use client";

import { useEffect, useRef } from "react";
import type { SkinId } from "@/app/lib/skins";

// Paleta temática de Frogger. Roles (cubren todo color antes hardcodeado):
//   roadBg / riverBg / safeBg — fondos de carretera, río y franjas seguras
//   goalRowBg                 — fondo de la fila superior de metas
//   goalPad / goalBorder      — hueco de meta y su marco
//   goalFilled                — rana ya depositada en una meta
//   car1 / car2 / car3        — carrocerías de los tres tipos de coche
//   truckBody / truckCab      — remolque y cabina del camión
//   wheel                     — ruedas de coches/camiones y pupilas
//   log / logLine             — tronco y sus vetas
//   turtle / turtleEdge       — caparazón de tortuga y su borde
//   frog / frogLeg            — cuerpo y patas de la rana jugadora
//   eyeWhite                  — esclerótica de los ojos de la rana
//   text                      — HUD (score / nivel) y overlay GAME OVER
//   hudBar                    — banda negra tras la barra de tiempo
//   lives                     — iconos de vidas restantes
//   timeGood / timeWarn / timeDanger — barra de tiempo por tramo
//   overlay                   — velo del overlay de fin de partida
//   glow                      — shadowBlur de rana/metas (0 = sin brillo)
interface FroggerPalette {
  roadBg: string;
  riverBg: string;
  safeBg: string;
  goalRowBg: string;
  goalPad: string;
  goalBorder: string;
  goalFilled: string;
  car1: string;
  car2: string;
  car3: string;
  truckBody: string;
  truckCab: string;
  wheel: string;
  log: string;
  logLine: string;
  turtle: string;
  turtleEdge: string;
  frog: string;
  frogLeg: string;
  eyeWhite: string;
  text: string;
  hudBar: string;
  lives: string;
  timeGood: string;
  timeWarn: string;
  timeDanger: string;
  overlay: string;
  glow: number;
}

const SKINS: Record<SkinId, FroggerPalette> = {
  // Arcade limpio, alto contraste, sin glow. Default de partida nueva.
  classic: {
    roadBg: "#0a0a0a",
    riverBg: "#001830",
    safeBg: "#0a1f0f",
    goalRowBg: "#0d3a1a",
    goalPad: "#0d5a2a",
    goalBorder: "#f5d000",
    goalFilled: "#00ff88",
    car1: "#ff3b3b",
    car2: "#f5ff00",
    car3: "#00c8ff",
    truckBody: "#8a8a99",
    truckCab: "#c0c0d0",
    wheel: "#111111",
    log: "#7a4a20",
    logLine: "rgba(0,0,0,0.35)",
    turtle: "#2ecc71",
    turtleEdge: "#145a32",
    frog: "#39ff14",
    frogLeg: "#39ff14",
    eyeWhite: "#ffffff",
    text: "#ffffff",
    hudBar: "#000000",
    lives: "#39ff14",
    timeGood: "#00ff88",
    timeWarn: "#f5ff00",
    timeDanger: "#ff2d2d",
    overlay: "rgba(0,0,0,0.6)",
    glow: 0,
  },
  // Saturado, con brillo de fósforo (shadowBlur) sobre fondo casi negro.
  neon: {
    roadBg: "#050510",
    riverBg: "#02063a",
    safeBg: "#041a12",
    goalRowBg: "#06251a",
    goalPad: "#103a2e",
    goalBorder: "#ff00d4",
    goalFilled: "#00ffa2",
    car1: "#ff2b6d",
    car2: "#faff00",
    car3: "#00e5ff",
    truckBody: "#7a4dff",
    truckCab: "#b28bff",
    wheel: "#0a0012",
    log: "#ff7b2e",
    logLine: "rgba(0,0,0,0.4)",
    turtle: "#00ffb3",
    turtleEdge: "#0a6b4d",
    frog: "#39ff14",
    frogLeg: "#39ff14",
    eyeWhite: "#eafff5",
    text: "#eafff5",
    hudBar: "#02010a",
    lives: "#39ff14",
    timeGood: "#00ffa2",
    timeWarn: "#faff00",
    timeDanger: "#ff2b6d",
    overlay: "rgba(2,0,8,0.65)",
    glow: 14,
  },
  // Fósforo CRT apagado: ámbar/verde desaturado de monitor viejo, contraste
  // suave pero siempre legible sobre el marco negro.
  retro: {
    roadBg: "#0d0b06",
    riverBg: "#0a1418",
    safeBg: "#10130a",
    goalRowBg: "#141a0d",
    goalPad: "#2a3318",
    goalBorder: "#c9a24a",
    goalFilled: "#9fc27a",
    car1: "#c46a4a",
    car2: "#c9a24a",
    car3: "#6a94a0",
    truckBody: "#7a7566",
    truckCab: "#a39d8a",
    wheel: "#100d06",
    log: "#6b4a2c",
    logLine: "rgba(0,0,0,0.35)",
    turtle: "#7db38a",
    turtleEdge: "#3a5238",
    frog: "#b7e08a",
    frogLeg: "#b7e08a",
    eyeWhite: "#ffe0a3",
    text: "#ffe0a3",
    hudBar: "#0d0b06",
    lives: "#b7e08a",
    timeGood: "#9fc27a",
    timeWarn: "#d8c06a",
    timeDanger: "#c46a4a",
    overlay: "rgba(13,11,6,0.66)",
    glow: 0,
  },
};

const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

// Zonas (índice de fila, 0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const START_COL = Math.floor(COLS / 2);

const JUMP_DURATION_MS = 120;

const ROAD_MIN_SPEED = 0.7;
const ROAD_MAX_SPEED = 1.8;
const RIVER_MIN_SPEED = 0.5;
const RIVER_MAX_SPEED = 1.3;
const LEVEL_SPEED_MULT = 1.15;

const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGE_MS = 1500;
const TURTLE_CYCLE_MS = TURTLE_VISIBLE_MS + TURTLE_SUBMERGE_MS;

const ROUND_TIME_BASE_MS = 15000;
const ROUND_TIME_MIN_MS = 6000;
const ROUND_TIME_STEP_MS = 1000;

const ADVANCE_POINTS = 10;
const GOAL_POINTS = 50;
const ROUND_COMPLETE_POINTS = 200;
const TIME_BONUS_PER_SEC = 10;

const GOALS = [
  { start: 1, end: 2 },
  { start: 4, end: 5 },
  { start: 7, end: 8 },
  { start: 10, end: 11 },
  { start: 13, end: 14 },
];

const INITIAL_LIVES = 3;

type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  cycleOffset?: number;
}

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
  margin: number;
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
  bestRow: number;
}

type GamePhase = "playing" | "gameover";

interface GameState {
  lanes: Lane[];
  frog: Frog;
  score: number;
  lives: number;
  level: number;
  goalsOccupied: boolean[];
  roundTimeMs: number;
  roundTimeMax: number;
  pendingDir: Direction | null;
  lastTime: number | null;
  phase: GamePhase;
  gameOverFired: boolean;
}

function speedScaleForLevel(level: number) {
  return Math.pow(LEVEL_SPEED_MULT, level - 1);
}

function roundTimeForLevel(level: number) {
  return Math.max(
    ROUND_TIME_MIN_MS,
    ROUND_TIME_BASE_MS - (level - 1) * ROUND_TIME_STEP_MS,
  );
}

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const ROAD_LANE_MARGIN = 6;
const RIVER_LANE_MARGIN = 8;

function buildRoadLane(row: number, laneIndex: number, level: number): Lane {
  const scale = speedScaleForLevel(level);
  const speed = randRange(ROAD_MIN_SPEED, ROAD_MAX_SPEED) * scale;
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const entities: Entity[] = [];
  const margin = ROAD_LANE_MARGIN;
  let col = -margin;
  while (col < COLS + margin) {
    const isTruck = Math.random() < 0.35;
    const width = isTruck
      ? Math.floor(randRange(2, 4))
      : Math.floor(randRange(1, 3));
    entities.push({ col, width, type: isTruck ? "truck" : "car" });
    col += width + randRange(2.5, 5);
  }
  return { row, speed, dir, entities, margin };
}

function buildRiverLane(row: number, laneIndex: number, level: number): Lane {
  const scale = speedScaleForLevel(level);
  const speed = randRange(RIVER_MIN_SPEED, RIVER_MAX_SPEED) * scale;
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const entities: Entity[] = [];
  const isTurtleLane = laneIndex % 3 === 1;
  const margin = RIVER_LANE_MARGIN;
  let col = -margin;
  let i = 0;
  while (col < COLS + margin) {
    const width = isTurtleLane
      ? Math.floor(randRange(2, 4))
      : Math.floor(randRange(2, 5));
    entities.push({
      col,
      width,
      type: isTurtleLane ? "turtle" : "log",
      submerged: false,
      cycleOffset: (i * 733) % TURTLE_CYCLE_MS,
    });
    col += width + randRange(2, 4);
    i += 1;
  }
  return { row, speed, dir, entities, margin };
}

function buildLanes(level: number): Lane[] {
  const lanes: Lane[] = [];
  let roadIdx = 0;
  for (let row = ROW_ROAD_TOP; row <= ROW_ROAD_BOT; row++) {
    lanes.push(buildRoadLane(row, roadIdx, level));
    roadIdx += 1;
  }
  let riverIdx = 0;
  for (let row = ROW_RIVER_TOP; row <= ROW_RIVER_BOT; row++) {
    lanes.push(buildRiverLane(row, riverIdx, level));
    riverIdx += 1;
  }
  return lanes;
}

function createFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    animating: false,
    animT: 0,
    fromCol: START_COL,
    fromRow: ROW_START,
    targetCol: START_COL,
    targetRow: ROW_START,
    bestRow: ROW_START,
  };
}

function createGameState(): GameState {
  return {
    lanes: buildLanes(1),
    frog: createFrog(),
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    goalsOccupied: [false, false, false, false, false],
    roundTimeMs: roundTimeForLevel(1),
    roundTimeMax: roundTimeForLevel(1),
    pendingDir: null,
    lastTime: null,
    phase: "playing",
    gameOverFired: false,
  };
}

function goalIndexForCol(col: number): number {
  return GOALS.findIndex((g) => col >= g.start && col <= g.end);
}

function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  const c = frog.col + 0.5;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_ROAD_TOP || lane.row > ROW_ROAD_BOT) continue;
    for (const e of lane.entities) {
      if (c >= e.col && c < e.col + e.width) return true;
    }
  }
  return false;
}

function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  const c = frog.col + 0.5;
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_RIVER_TOP || lane.row > ROW_RIVER_BOT) continue;
    for (const e of lane.entities) {
      if (c >= e.col && c < e.col + e.width) {
        if (e.type === "turtle" && e.submerged) return null;
        return e;
      }
    }
    return null;
  }
  return null;
}

function resetFrogPosition(g: GameState) {
  g.frog.col = START_COL;
  g.frog.row = ROW_START;
  g.frog.animating = false;
  g.frog.animT = 0;
  g.roundTimeMs = g.roundTimeMax;
}

function killFrog(g: GameState) {
  g.lives -= 1;
  if (g.lives <= 0) {
    g.lives = 0;
    g.phase = "gameover";
    return;
  }
  resetFrogPosition(g);
}

function completeRound(g: GameState) {
  g.score += ROUND_COMPLETE_POINTS;
  g.level += 1;
  g.goalsOccupied = [false, false, false, false, false];
  g.lanes = buildLanes(g.level);
  g.roundTimeMax = roundTimeForLevel(g.level);
  g.frog.bestRow = ROW_START;
  resetFrogPosition(g);
}

function resolveLanding(g: GameState) {
  const frog = g.frog;

  if (frog.row === ROW_GOALS) {
    const idx = goalIndexForCol(frog.col);
    if (idx === -1 || g.goalsOccupied[idx]) {
      killFrog(g);
      return;
    }
    g.goalsOccupied[idx] = true;
    const timeBonus = Math.ceil(g.roundTimeMs / 1000) * TIME_BONUS_PER_SEC;
    g.score += GOAL_POINTS + timeBonus;
    if (g.goalsOccupied.every(Boolean)) {
      completeRound(g);
    } else {
      resetFrogPosition(g);
    }
    return;
  }

  if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
    if (checkRoadCollision(frog, g.lanes)) {
      killFrog(g);
      return;
    }
  }

  if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
    if (!getSupport(frog, g.lanes)) {
      killFrog(g);
      return;
    }
  }

  if (frog.row < frog.bestRow) {
    g.score += ADVANCE_POINTS * (frog.bestRow - frog.row);
    frog.bestRow = frog.row;
  }
}

function updateEntities(lanes: Lane[], dt: number) {
  for (const lane of lanes) {
    const cycle = COLS + 2 * lane.margin;
    for (const e of lane.entities) {
      e.col += (lane.speed * lane.dir * dt) / 16 / CELL;
      if (lane.dir === 1 && e.col > COLS + lane.margin) {
        e.col -= cycle;
      } else if (lane.dir === -1 && e.col + e.width < -lane.margin) {
        e.col += cycle;
      }
      if (e.type === "turtle") {
        e.cycleOffset = ((e.cycleOffset ?? 0) + dt) % TURTLE_CYCLE_MS;
        e.submerged = e.cycleOffset >= TURTLE_VISIBLE_MS;
      }
    }
  }
}

function update(g: GameState, dt: number) {
  if (g.phase !== "playing") return;

  updateEntities(g.lanes, dt);

  const frog = g.frog;

  if (!frog.animating && g.pendingDir) {
    const dir = g.pendingDir;
    g.pendingDir = null;
    let targetCol = frog.col;
    let targetRow = frog.row;
    if (dir === "up") targetRow -= 1;
    else if (dir === "down") targetRow += 1;
    else if (dir === "left") targetCol -= 1;
    else if (dir === "right") targetCol += 1;

    if (targetCol < 0 || targetCol >= COLS) {
      // fuera de límites laterales: ignorar el salto
    } else if (targetRow < ROW_GOALS || targetRow > ROW_START) {
      // fuera de límites verticales: ignorar el salto
    } else {
      frog.animating = true;
      frog.animT = 0;
      frog.fromCol = frog.col;
      frog.fromRow = frog.row;
      frog.targetCol = targetCol;
      frog.targetRow = targetRow;
    }
  }

  if (frog.animating) {
    frog.animT += dt;
    if (frog.animT >= JUMP_DURATION_MS) {
      frog.col = frog.targetCol;
      frog.row = frog.targetRow;
      frog.animating = false;
      frog.animT = 0;
      resolveLanding(g);
    }
  } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
    const support = getSupport(frog, g.lanes);
    if (!support) {
      if (g.phase === "playing") killFrog(g);
    } else {
      const lane = g.lanes.find((l) => l.row === frog.row)!;
      frog.col += (lane.speed * lane.dir * dt) / 16 / CELL;
      if (frog.col + 0.5 < 0 || frog.col + 0.5 >= COLS) {
        killFrog(g);
      }
    }
  }

  if (g.phase === "playing" && !frog.animating) {
    g.roundTimeMs -= dt;
    if (g.roundTimeMs <= 0) {
      g.roundTimeMs = 0;
      killFrog(g);
    }
  }
}

function timeBarColor(ratio: number, pal: FroggerPalette) {
  if (ratio > 0.5) return pal.timeGood;
  if (ratio > 0.2) return pal.timeWarn;
  return pal.timeDanger;
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  row: number,
  e: Entity,
  pal: FroggerPalette,
) {
  const x = e.col * CELL;
  const y = row * CELL;
  const w = e.width * CELL;
  const h = CELL;

  if (e.type === "car") {
    const colorIdx = ((Math.floor(e.col) % 3) + 3) % 3;
    ctx.fillStyle =
      colorIdx === 0 ? pal.car1 : colorIdx === 1 ? pal.car2 : pal.car3;
    ctx.fillRect(x + 3, y + 6, w - 6, h - 12);
    ctx.fillStyle = pal.wheel;
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 8, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 8, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "truck") {
    ctx.fillStyle = pal.truckBody;
    ctx.fillRect(x + 2, y + 5, w - 4, h - 10);
    ctx.fillStyle = pal.truckCab;
    ctx.fillRect(x + 2, y + 5, CELL - 8, h - 10);
    ctx.fillStyle = pal.wheel;
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 6, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "log") {
    ctx.fillStyle = pal.log;
    ctx.fillRect(x + 1, y + 8, w - 2, h - 16);
    ctx.strokeStyle = pal.logLine;
    ctx.lineWidth = 2;
    for (let i = 1; i < e.width; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * CELL, y + 8);
      ctx.lineTo(x + i * CELL, y + h - 8);
      ctx.stroke();
    }
  } else if (e.type === "turtle") {
    ctx.globalAlpha = e.submerged ? 0.3 : 1;
    for (let i = 0; i < e.width; i++) {
      ctx.fillStyle = pal.turtle;
      ctx.beginPath();
      ctx.arc(x + i * CELL + CELL / 2, y + h / 2, CELL / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = pal.turtleEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function rowBackground(row: number, pal: FroggerPalette): string {
  if (row === ROW_GOALS) return pal.goalRowBg;
  if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return pal.riverBg;
  if (row === ROW_SAFE_MID || row === ROW_START) return pal.safeBg;
  return pal.roadBg;
}

function draw(
  ctx: CanvasRenderingContext2D,
  g: GameState,
  pal: FroggerPalette,
) {
  for (let row = 0; row < ROWS; row++) {
    ctx.fillStyle = rowBackground(row, pal);
    ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
  }

  for (const goal of GOALS) {
    const x = goal.start * CELL;
    const w = (goal.end - goal.start + 1) * CELL;
    const idx = GOALS.indexOf(goal);
    ctx.fillStyle = pal.goalPad;
    ctx.fillRect(x, 0, w, CELL);
    ctx.strokeStyle = pal.goalBorder;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, 2, w - 4, CELL - 4);
    if (g.goalsOccupied[idx]) {
      ctx.shadowBlur = pal.glow;
      ctx.shadowColor = pal.goalFilled;
      ctx.fillStyle = pal.goalFilled;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, CELL / 2, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  for (const lane of g.lanes) {
    for (const e of lane.entities) {
      drawEntity(ctx, lane.row, e, pal);
    }
  }

  const frog = g.frog;
  let drawCol = frog.col;
  let drawRow = frog.row;
  if (frog.animating) {
    const t = Math.min(1, frog.animT / JUMP_DURATION_MS);
    drawCol = frog.fromCol + (frog.targetCol - frog.fromCol) * t;
    drawRow = frog.fromRow + (frog.targetRow - frog.fromRow) * t;
  }
  const fx = drawCol * CELL + CELL / 2;
  const fy = drawRow * CELL + CELL / 2;
  const jumpLift = frog.animating
    ? Math.sin(Math.min(1, frog.animT / JUMP_DURATION_MS) * Math.PI) * 6
    : 0;
  ctx.shadowBlur = pal.glow;
  ctx.shadowColor = pal.frog;
  ctx.fillStyle = pal.frog;
  ctx.beginPath();
  ctx.ellipse(fx, fy - jumpLift, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (frog.animating) {
    ctx.strokeStyle = pal.frogLeg;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx - 16, fy - jumpLift);
    ctx.lineTo(fx - 22, fy - jumpLift + 6);
    ctx.moveTo(fx + 16, fy - jumpLift);
    ctx.lineTo(fx + 22, fy - jumpLift + 6);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = pal.eyeWhite;
  ctx.beginPath();
  ctx.arc(fx - 6, fy - jumpLift - 6, 3.5, 0, Math.PI * 2);
  ctx.arc(fx + 6, fy - jumpLift - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = pal.wheel;
  ctx.beginPath();
  ctx.arc(fx - 6, fy - jumpLift - 6, 1.6, 0, Math.PI * 2);
  ctx.arc(fx + 6, fy - jumpLift - 6, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = pal.hudBar;
  ctx.fillRect(0, 0, CANVAS_W, CELL / 2);
  const ratio = g.roundTimeMax > 0 ? g.roundTimeMs / g.roundTimeMax : 0;
  ctx.fillStyle = timeBarColor(ratio, pal);
  ctx.fillRect(0, 0, CANVAS_W * Math.max(0, ratio), 6);

  ctx.fillStyle = pal.text;
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Score: " + g.score, 8, 10);
  ctx.textAlign = "center";
  ctx.fillText("Nivel: " + g.level, CANVAS_W / 2, 10);
  ctx.textAlign = "right";
  for (let i = 0; i < g.lives; i++) {
    ctx.fillStyle = pal.lives;
    ctx.beginPath();
    ctx.ellipse(CANVAS_W - 14 - i * 22, 16, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (g.phase === "gameover") {
    ctx.fillStyle = pal.overlay;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = pal.text;
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2);
  }
}

export interface FroggerGameProps {
  paused: boolean;
  restartSignal: number;
  skin: SkinId;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

export default function FroggerGame({
  paused,
  restartSignal,
  skin,
  onStateChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const skinRef = useRef(skin);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
  const lastScoreRef = useRef(0);
  const lastLivesRef = useRef(INITIAL_LIVES);
  const lastLevelRef = useRef(1);
  const firstRestart = useRef(true);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    if (firstRestart.current) {
      firstRestart.current = false;
    } else {
      gameRef.current = createGameState();
      lastScoreRef.current = 0;
      lastLivesRef.current = INITIAL_LIVES;
      lastLevelRef.current = 1;
    }
    onStateChangeRef.current({
      score: 0,
      lives: INITIAL_LIVES,
      level: 1,
    });
  }, [restartSignal]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const g = gameRef.current;
      if (!g) return;
      let dir: Direction | null = null;
      if (e.key === "ArrowUp") dir = "up";
      else if (e.key === "ArrowDown") dir = "down";
      else if (e.key === "ArrowLeft") dir = "left";
      else if (e.key === "ArrowRight") dir = "right";
      if (!dir) return;
      e.preventDefault();
      g.pendingDir = dir;
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;

    function loop(ts: number) {
      if (!ctx) return;
      if (!gameRef.current) gameRef.current = createGameState();
      const g = gameRef.current;

      if (!pausedRef.current) {
        const dt = g.lastTime === null ? 0 : ts - g.lastTime;
        g.lastTime = ts;
        update(g, Math.min(dt, 100));

        if (
          g.score !== lastScoreRef.current ||
          g.lives !== lastLivesRef.current ||
          g.level !== lastLevelRef.current
        ) {
          lastScoreRef.current = g.score;
          lastLivesRef.current = g.lives;
          lastLevelRef.current = g.level;
          onStateChangeRef.current({
            score: g.score,
            lives: g.lives,
            level: g.level,
          });
        }
        if (g.phase === "gameover" && !g.gameOverFired) {
          g.gameOverFired = true;
          onGameOverRef.current(g.score);
        }
      } else {
        g.lastTime = null;
      }

      draw(ctx, g, SKINS[skinRef.current]);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          display: "block",
        }}
      />
    </div>
  );
}
