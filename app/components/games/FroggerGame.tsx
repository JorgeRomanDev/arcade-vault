"use client";

import { useEffect, useRef } from "react";

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

const ROAD_MIN_SPEED = 1.5;
const ROAD_MAX_SPEED = 4;
const RIVER_MIN_SPEED = 1;
const RIVER_MAX_SPEED = 3;
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

function buildRoadLane(row: number, laneIndex: number, level: number): Lane {
  const scale = speedScaleForLevel(level);
  const speed = randRange(ROAD_MIN_SPEED, ROAD_MAX_SPEED) * scale;
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const entities: Entity[] = [];
  let col = -6;
  while (col < COLS + 6) {
    const isTruck = Math.random() < 0.35;
    const width = isTruck
      ? Math.floor(randRange(2, 4))
      : Math.floor(randRange(1, 3));
    entities.push({ col, width, type: isTruck ? "truck" : "car" });
    col += width + randRange(2.5, 5);
  }
  return { row, speed, dir, entities };
}

function buildRiverLane(row: number, laneIndex: number, level: number): Lane {
  const scale = speedScaleForLevel(level);
  const speed = randRange(RIVER_MIN_SPEED, RIVER_MAX_SPEED) * scale;
  const dir: 1 | -1 = laneIndex % 2 === 0 ? 1 : -1;
  const entities: Entity[] = [];
  const isTurtleLane = laneIndex % 3 === 1;
  let col = -8;
  let i = 0;
  while (col < COLS + 8) {
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
  return { row, speed, dir, entities };
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
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_ROAD_TOP || lane.row > ROW_ROAD_BOT) continue;
    for (const e of lane.entities) {
      if (frog.col >= e.col && frog.col < e.col + e.width) return true;
    }
  }
  return false;
}

function getSupport(frog: Frog, lanes: Lane[]): Entity | null {
  for (const lane of lanes) {
    if (lane.row !== frog.row) continue;
    if (lane.row < ROW_RIVER_TOP || lane.row > ROW_RIVER_BOT) continue;
    for (const e of lane.entities) {
      if (frog.col >= e.col && frog.col < e.col + e.width) {
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
    for (const e of lane.entities) {
      e.col += (lane.speed * lane.dir * dt) / 16;
      if (lane.dir === 1 && e.col > COLS) {
        e.col = -e.width;
      } else if (lane.dir === -1 && e.col + e.width < 0) {
        e.col = COLS;
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
      frog.col += (lane.speed * lane.dir * dt) / 16;
      if (frog.col < 0 || frog.col >= COLS) {
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

function timeBarColor(ratio: number) {
  if (ratio > 0.5) return "#00ff88";
  if (ratio > 0.2) return "#f5ff00";
  return "#ff2d2d";
}

function drawEntity(ctx: CanvasRenderingContext2D, row: number, e: Entity) {
  const x = e.col * CELL;
  const y = row * CELL;
  const w = e.width * CELL;
  const h = CELL;

  if (e.type === "car") {
    const colorIdx = ((Math.floor(e.col) % 3) + 3) % 3;
    ctx.fillStyle = ["#ff3b3b", "#f5ff00", "#00c8ff"][colorIdx];
    ctx.fillRect(x + 3, y + 6, w - 6, h - 12);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 8, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 8, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "truck") {
    ctx.fillStyle = "#8a8a99";
    ctx.fillRect(x + 2, y + 5, w - 4, h - 10);
    ctx.fillStyle = "#c0c0d0";
    ctx.fillRect(x + 2, y + 5, CELL - 8, h - 10);
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(x + 10, y + h - 6, 5, 0, Math.PI * 2);
    ctx.arc(x + w - 10, y + h - 6, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "log") {
    ctx.fillStyle = "#7a4a20";
    ctx.fillRect(x + 1, y + 8, w - 2, h - 16);
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
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
      ctx.fillStyle = "#2ecc71";
      ctx.beginPath();
      ctx.arc(x + i * CELL + CELL / 2, y + h / 2, CELL / 2 - 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#145a32";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function rowBackground(row: number): string {
  if (row === ROW_GOALS) return "#0d3a1a";
  if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return "#001830";
  if (row === ROW_SAFE_MID || row === ROW_START) return "#0a1f0f";
  return "#0a0a0a";
}

function draw(ctx: CanvasRenderingContext2D, g: GameState) {
  for (let row = 0; row < ROWS; row++) {
    ctx.fillStyle = rowBackground(row);
    ctx.fillRect(0, row * CELL, CANVAS_W, CELL);
  }

  for (const goal of GOALS) {
    const x = goal.start * CELL;
    const w = (goal.end - goal.start + 1) * CELL;
    const idx = GOALS.indexOf(goal);
    ctx.fillStyle = "#0d5a2a";
    ctx.fillRect(x, 0, w, CELL);
    ctx.strokeStyle = "#f5d000";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, 2, w - 4, CELL - 4);
    if (g.goalsOccupied[idx]) {
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, CELL / 2, 12, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const lane of g.lanes) {
    for (const e of lane.entities) {
      drawEntity(ctx, lane.row, e);
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
  ctx.fillStyle = "#39ff14";
  ctx.beginPath();
  ctx.ellipse(fx, fy - jumpLift, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (frog.animating) {
    ctx.strokeStyle = "#39ff14";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx - 16, fy - jumpLift);
    ctx.lineTo(fx - 22, fy - jumpLift + 6);
    ctx.moveTo(fx + 16, fy - jumpLift);
    ctx.lineTo(fx + 22, fy - jumpLift + 6);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(fx - 6, fy - jumpLift - 6, 3.5, 0, Math.PI * 2);
  ctx.arc(fx + 6, fy - jumpLift - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(fx - 6, fy - jumpLift - 6, 1.6, 0, Math.PI * 2);
  ctx.arc(fx + 6, fy - jumpLift - 6, 1.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS_W, CELL / 2);
  const ratio = g.roundTimeMax > 0 ? g.roundTimeMs / g.roundTimeMax : 0;
  ctx.fillStyle = timeBarColor(ratio);
  ctx.fillRect(0, 0, CANVAS_W * Math.max(0, ratio), 6);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Score: " + g.score, 8, 10);
  ctx.textAlign = "center";
  ctx.fillText("Nivel: " + g.level, CANVAS_W / 2, 10);
  ctx.textAlign = "right";
  for (let i = 0; i < g.lives; i++) {
    ctx.fillStyle = "#39ff14";
    ctx.beginPath();
    ctx.ellipse(CANVAS_W - 14 - i * 22, 16, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (g.phase === "gameover") {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2);
  }
}

export interface FroggerGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

export default function FroggerGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onScoreChangeRef = useRef(onScoreChange);
  const onLivesChangeRef = useRef(onLivesChange);
  const onLevelChangeRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);
  const lastScoreRef = useRef(0);
  const lastLivesRef = useRef(INITIAL_LIVES);
  const lastLevelRef = useRef(1);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onLivesChangeRef.current = onLivesChange;
  }, [onLivesChange]);
  useEffect(() => {
    onLevelChangeRef.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

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

        if (g.score !== lastScoreRef.current) {
          lastScoreRef.current = g.score;
          onScoreChangeRef.current(g.score);
        }
        if (g.lives !== lastLivesRef.current) {
          lastLivesRef.current = g.lives;
          onLivesChangeRef.current(g.lives);
        }
        if (g.level !== lastLevelRef.current) {
          lastLevelRef.current = g.level;
          onLevelChangeRef.current(g.level);
        }
        if (g.phase === "gameover" && !g.gameOverFired) {
          g.gameOverFired = true;
          onGameOverRef.current(g.score);
        }
      } else {
        g.lastTime = null;
      }

      draw(ctx, g);
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
