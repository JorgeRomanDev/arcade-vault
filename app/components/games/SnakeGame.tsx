"use client";

import { useEffect, useRef } from "react";
import type { SkinId } from "@/app/lib/skins";

// Paleta temática de Snake. Roles:
//   bg      — fondo del tablero
//   grid    — líneas de la cuadrícula
//   snake   — cuerpo de la serpiente
//   head    — cabeza de la serpiente (acento sobre el cuerpo)
//   text    — HUD (score / nivel) y texto del overlay GAME OVER
//   overlay — velo oscuro del overlay de fin de partida
//   glow    — shadowBlur de serpiente y cabeza (0 = sin brillo)
interface SnakePalette {
  bg: string;
  grid: string;
  snake: string;
  head: string;
  text: string;
  overlay: string;
  glow: number;
}

const SKINS: Record<SkinId, SnakePalette> = {
  // Arcade limpio, alto contraste, sin glow. Default de partida nueva.
  classic: {
    bg: "#0a0a0f",
    grid: "rgba(255,255,255,0.08)",
    snake: "#2ecc71",
    head: "#7dffb0",
    text: "#ffffff",
    overlay: "rgba(0,0,0,0.6)",
    glow: 0,
  },
  // Saturado, con brillo de fósforo (shadowBlur) sobre fondo casi negro.
  neon: {
    bg: "#04010a",
    grid: "rgba(0,245,136,0.12)",
    snake: "#00ff88",
    head: "#c8ffe6",
    text: "#eafff5",
    overlay: "rgba(2,0,8,0.65)",
    glow: 14,
  },
  // Fósforo CRT apagado: verde monitor viejo desaturado, contraste suave pero
  // siempre legible sobre el marco negro.
  retro: {
    bg: "#0d0b06",
    grid: "rgba(120,179,138,0.12)",
    snake: "#7db38a",
    head: "#cdeac0",
    text: "#ffe0a3",
    overlay: "rgba(13,11,6,0.66)",
    glow: 0,
  },
};

const CANVAS_W = 800;
const CANVAS_H = 600;
const CELL = 20;
const COLS = CANVAS_W / CELL;
const ROWS = CANVAS_H / CELL;

const TICK_INITIAL_MS = 160;
const TICK_STEP_MS = 15;
const TICK_MIN_MS = 60;
const FRUITS_PER_LEVEL = 5;

const FRUIT_SHEET_SRC = "/snake/fruits.png";

interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRUIT_ATLAS: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};

const FRUIT_KEYS = Object.keys(FRUIT_ATLAS);

interface Cell {
  x: number;
  y: number;
}

interface Fruit {
  cell: Cell;
  key: string;
}

type Direction = { x: number; y: number };

const DIR_UP: Direction = { x: 0, y: -1 };
const DIR_DOWN: Direction = { x: 0, y: 1 };
const DIR_LEFT: Direction = { x: -1, y: 0 };
const DIR_RIGHT: Direction = { x: 1, y: 0 };

type GamePhase = "playing" | "gameover";

interface GameState {
  snake: Cell[];
  direction: Direction;
  queuedDirection: Direction;
  fruit: Fruit;
  score: number;
  level: number;
  fruitsEaten: number;
  tickMs: number;
  tickAccumulator: number;
  lastTime: number | null;
  gameState: GamePhase;
  gameOverFired: boolean;
}

function tickForLevel(level: number) {
  return Math.max(TICK_MIN_MS, TICK_INITIAL_MS - (level - 1) * TICK_STEP_MS);
}

function randomFreeCell(snake: Cell[]): Cell {
  while (true) {
    const cell = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
    if (!snake.some((seg) => seg.x === cell.x && seg.y === cell.y)) return cell;
  }
}

function spawnFruit(snake: Cell[]): Fruit {
  return {
    cell: randomFreeCell(snake),
    key: FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)],
  };
}

function createGameState(): GameState {
  const startX = Math.floor(COLS / 2);
  const startY = Math.floor(ROWS / 2);
  const snake: Cell[] = [
    { x: startX, y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  return {
    snake,
    direction: DIR_RIGHT,
    queuedDirection: DIR_RIGHT,
    fruit: spawnFruit(snake),
    score: 0,
    level: 1,
    fruitsEaten: 0,
    tickMs: tickForLevel(1),
    tickAccumulator: 0,
    lastTime: null,
    gameState: "playing",
    gameOverFired: false,
  };
}

function isOpposite(a: Direction, b: Direction) {
  return a.x === -b.x && a.y === -b.y;
}

function step(g: GameState) {
  if (g.gameState !== "playing") return;

  g.direction = g.queuedDirection;
  const head = g.snake[0];
  const newHead: Cell = {
    x: head.x + g.direction.x,
    y: head.y + g.direction.y,
  };

  if (
    newHead.x < 0 ||
    newHead.x >= COLS ||
    newHead.y < 0 ||
    newHead.y >= ROWS
  ) {
    g.gameState = "gameover";
    return;
  }

  const willGrow = newHead.x === g.fruit.cell.x && newHead.y === g.fruit.cell.y;
  const bodyLen = willGrow ? g.snake.length : g.snake.length - 1;
  for (let i = 0; i < bodyLen; i++) {
    const seg = g.snake[i];
    if (seg.x === newHead.x && seg.y === newHead.y) {
      g.gameState = "gameover";
      return;
    }
  }

  g.snake.unshift(newHead);
  if (willGrow) {
    g.score += 10;
    g.fruitsEaten += 1;
    g.fruit = spawnFruit(g.snake);
    if (g.fruitsEaten % FRUITS_PER_LEVEL === 0) {
      g.level += 1;
      g.tickMs = tickForLevel(g.level);
    }
  } else {
    g.snake.pop();
  }
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  message: string,
  pal: SnakePalette,
) {
  ctx.fillStyle = pal.overlay;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = pal.text;
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, CANVAS_W / 2, CANVAS_H / 2);
}

function draw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource | null,
  g: GameState,
  pal: SnakePalette,
) {
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, CANVAS_H);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(CANVAS_W, r * CELL);
    ctx.stroke();
  }

  if (img) {
    const rect = FRUIT_ATLAS[g.fruit.key];
    ctx.drawImage(
      img,
      rect.x,
      rect.y,
      rect.w,
      rect.h,
      g.fruit.cell.x * CELL,
      g.fruit.cell.y * CELL,
      CELL,
      CELL,
    );
  }

  ctx.shadowBlur = pal.glow;
  g.snake.forEach((seg, i) => {
    const isHead = i === 0;
    ctx.fillStyle = isHead ? pal.head : pal.snake;
    ctx.shadowColor = isHead ? pal.head : pal.snake;
    ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
  });
  ctx.shadowBlur = 0;

  ctx.fillStyle = pal.text;
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("Score: " + g.score, 10, 10);
  ctx.textAlign = "center";
  ctx.fillText("Nivel: " + g.level, CANVAS_W / 2, 10);

  if (g.gameState === "gameover") drawOverlay(ctx, "GAME OVER", pal);
}

export interface SnakeGameProps {
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

export default function SnakeGame({
  paused,
  restartSignal,
  skin,
  onStateChange,
  onGameOver,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const skinRef = useRef(skin);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
  const fruitImgRef = useRef<HTMLImageElement | null>(null);
  const fruitReadyRef = useRef(false);
  const firstRestart = useRef(true);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    skinRef.current = skin;
  }, [skin]);

  useEffect(() => {
    if (firstRestart.current) {
      firstRestart.current = false;
    } else {
      gameRef.current = createGameState();
    }
    onStateChangeRef.current({ score: 0, lives: 1, level: 1 });
  }, [restartSignal]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const g = gameRef.current;
      if (!g) return;
      let newDir: Direction | null = null;
      if (e.key === "ArrowUp") newDir = DIR_UP;
      else if (e.key === "ArrowDown") newDir = DIR_DOWN;
      else if (e.key === "ArrowLeft") newDir = DIR_LEFT;
      else if (e.key === "ArrowRight") newDir = DIR_RIGHT;
      if (!newDir) return;
      e.preventDefault();
      if (isOpposite(newDir, g.direction)) return;
      g.queuedDirection = newDir;
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let cancelled = false;

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      fruitImgRef.current = img;
      fruitReadyRef.current = true;
    };
    img.src = FRUIT_SHEET_SRC;

    function loop(ts: number) {
      if (!ctx) return;
      if (!gameRef.current) gameRef.current = createGameState();
      const g = gameRef.current;

      if (!pausedRef.current && g.gameState === "playing") {
        const dt = g.lastTime === null ? 0 : ts - g.lastTime;
        g.lastTime = ts;
        g.tickAccumulator += Math.min(dt, 200);
        while (g.tickAccumulator >= g.tickMs && g.gameState === "playing") {
          g.tickAccumulator -= g.tickMs;
          step(g);
          onStateChangeRef.current({
            score: g.score,
            lives: 1,
            level: g.level,
          });
        }
        if (g.gameState !== "playing" && !g.gameOverFired) {
          g.gameOverFired = true;
          onGameOverRef.current(g.score);
        }
      } else {
        g.lastTime = null;
      }

      draw(
        ctx,
        fruitReadyRef.current ? fruitImgRef.current : null,
        g,
        SKINS[skinRef.current],
      );
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
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
