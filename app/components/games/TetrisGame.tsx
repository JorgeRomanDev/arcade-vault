"use client";

import { useEffect, useRef } from "react";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const W = COLS * BLOCK;
const H = ROWS * BLOCK;
const NEXT_SIZE = 120;
const NEXT_BLOCK = 30;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
];

const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

interface GameState {
  board: number[][];
  current: Piece;
  next: Piece;
  score: number;
  lines: number;
  level: number;
  dropInterval: number;
  dropAccum: number;
  gameOver: boolean;
  gameOverFired: boolean;
  lastTime: number | null;
}

function createBoard(): number[][] {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

function collide(board: number[][], shape: number[][], ox: number, oy: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate(g: GameState) {
  const rotated = rotateCW(g.current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(g.board, rotated, g.current.x + kick, g.current.y)) {
      g.current.shape = rotated;
      g.current.x += kick;
      return;
    }
  }
}

function merge(g: GameState) {
  const { current, board } = g;
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines(g: GameState) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (g.board[r].every((v) => v !== 0)) {
      g.board.splice(r, 1);
      g.board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    g.lines += cleared;
    g.score += (LINE_SCORES[cleared] || 0) * g.level;
    g.level = Math.floor(g.lines / 10) + 1;
    g.dropInterval = Math.max(100, 1000 - (g.level - 1) * 90);
  }
}

function ghostY(g: GameState) {
  let gy = g.current.y;
  while (!collide(g.board, g.current.shape, g.current.x, gy + 1)) gy++;
  return gy;
}

function spawn(g: GameState) {
  g.current = g.next;
  g.next = randomPiece();
  if (collide(g.board, g.current.shape, g.current.x, g.current.y)) {
    g.gameOver = true;
  }
}

function lockPiece(g: GameState) {
  merge(g);
  clearLines(g);
  spawn(g);
}

function hardDrop(g: GameState) {
  const gy = ghostY(g);
  g.score += (gy - g.current.y) * 2;
  g.current.y = gy;
  lockPiece(g);
}

function softDrop(g: GameState) {
  if (!collide(g.board, g.current.shape, g.current.x, g.current.y + 1)) {
    g.current.y++;
    g.score += 1;
  } else {
    lockPiece(g);
  }
}

function createGameState(): GameState {
  return {
    board: createBoard(),
    current: randomPiece(),
    next: randomPiece(),
    score: 0,
    lines: 0,
    level: 1,
    dropInterval: 1000,
    dropAccum: 0,
    gameOver: false,
    gameOverFired: false,
    lastTime: null,
  };
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  if (!color) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function drawGame(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);
  drawGrid(ctx);

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, g.board[r][c], BLOCK);

  const gy = ghostY(g);
  for (let r = 0; r < g.current.shape.length; r++)
    for (let c = 0; c < g.current.shape[r].length; c++)
      if (g.current.shape[r][c])
        drawBlock(
          ctx,
          g.current.x + c,
          gy + r,
          g.current.shape[r][c],
          BLOCK,
          0.2,
        );

  for (let r = 0; r < g.current.shape.length; r++)
    for (let c = 0; c < g.current.shape[r].length; c++)
      drawBlock(
        ctx,
        g.current.x + c,
        g.current.y + r,
        g.current.shape[r][c],
        BLOCK,
      );
}

function drawNext(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
  const shape = g.next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
}

const CONTROL_CODES = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Space",
  "KeyX",
];

export interface TetrisGameProps {
  paused: boolean;
  restartSignal: number;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

export default function TetrisGame({
  paused,
  restartSignal,
  onStateChange,
  onGameOver,
}: TetrisGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
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
    if (firstRestart.current) {
      firstRestart.current = false;
      return;
    }
    gameRef.current = createGameState();
  }, [restartSignal]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.includes(e.code)) e.preventDefault();
      if (pausedRef.current) return;
      const g = gameRef.current;
      if (!g || g.gameOver) return;
      switch (e.code) {
        case "ArrowLeft":
          if (!collide(g.board, g.current.shape, g.current.x - 1, g.current.y))
            g.current.x--;
          break;
        case "ArrowRight":
          if (!collide(g.board, g.current.shape, g.current.x + 1, g.current.y))
            g.current.x++;
          break;
        case "ArrowDown":
          softDrop(g);
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate(g);
          break;
        case "Space":
          hardDrop(g);
          break;
        default:
          return;
      }
      onStateChangeRef.current({ score: g.score, lives: 1, level: g.level });
      if (g.gameOver && !g.gameOverFired) {
        g.gameOverFired = true;
        onGameOverRef.current(g.score);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx = canvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");
    if (!ctx || !nextCtx) return;

    let rafId: number;

    function loop(ts: number) {
      if (!ctx || !nextCtx) return;
      if (!gameRef.current) gameRef.current = createGameState();
      const g = gameRef.current;

      if (!pausedRef.current && !g.gameOver) {
        const dt = g.lastTime === null ? 0 : ts - g.lastTime;
        g.lastTime = ts;
        g.dropAccum += dt;
        if (g.dropAccum >= g.dropInterval) {
          g.dropAccum = 0;
          if (
            !collide(g.board, g.current.shape, g.current.x, g.current.y + 1)
          ) {
            g.current.y++;
          } else {
            lockPiece(g);
          }
          onStateChangeRef.current({
            score: g.score,
            lives: 1,
            level: g.level,
          });
          if (g.gameOver && !g.gameOverFired) {
            g.gameOverFired = true;
            onGameOverRef.current(g.score);
          }
        }
      } else {
        g.lastTime = null;
      }

      drawGame(ctx, g);
      drawNext(nextCtx, g);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
          display: "block",
        }}
      />
      <canvas
        ref={nextCanvasRef}
        width={NEXT_SIZE}
        height={NEXT_SIZE}
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}
