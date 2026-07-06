"use client";

import { useEffect, useRef } from "react";
import spritesheetSrc from "./assets/arkanoid/spritesheet-breakout.png";

const CANVAS_W = 800;
const CANVAS_H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITES: { paddle: SpriteRect; ball: SpriteRect } & {
  blocks: Record<BlockColor, SpriteRect>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

const EXPLOSION_DURATION = 150;

const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

interface LevelDef {
  speed: number;
  blocks: { col: number; row: number; color: BlockColor }[];
}

const LEVELS: LevelDef[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: LevelDef["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelDef["blocks"] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelDef["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelDef["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelDef["blocks"] = [];
  for (let row = 0; row < BLOCK_ROWS; row++)
    for (let col = 0; col < BLOCK_COLS; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({
          col,
          row,
          color: isCross && !isFrame ? "hotpink" : "cyan",
        });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

type GamePhase = "playing" | "gameover" | "win";

interface GameState {
  paddle: Paddle;
  ball: Ball;
  blocks: Block[];
  explosions: Explosion[];
  lives: number;
  score: number;
  currentLevel: number;
  gameState: GamePhase;
  gameOverFired: boolean;
  lastTime: number | null;
}

function initPaddle(paddle: Paddle) {
  paddle.x = (CANVAS_W - paddle.w) / 2;
}

function resetBall(ball: Ball, paddle: Paddle, level: LevelDef) {
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * level.speed;
  ball.vy = BASE_BALL_VY * level.speed;
}

function loadLevel(g: GameState, n: number) {
  g.currentLevel = n;
  const level = LEVELS[n - 1];
  g.blocks = level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
  g.explosions = [];
  resetBall(g.ball, g.paddle, level);
}

function collideAABB(ball: Ball, block: Block) {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}

function createGameState(): GameState {
  const paddle: Paddle = { x: 0, y: 560, w: 81, h: 14 };
  const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
  initPaddle(paddle);
  const g: GameState = {
    paddle,
    ball,
    blocks: [],
    explosions: [],
    lives: 3,
    score: 0,
    currentLevel: 1,
    gameState: "playing",
    gameOverFired: false,
    lastTime: null,
  };
  loadLevel(g, 1);
  return g;
}

function playSound(audio: HTMLAudioElement | null) {
  if (!audio) return;
  const clone = audio.cloneNode(true) as HTMLAudioElement;
  clone.play().catch(() => {});
}

interface Sounds {
  bounce: HTMLAudioElement | null;
  breakBlock: HTMLAudioElement | null;
}

function update(
  g: GameState,
  dt: number,
  keys: { left: boolean; right: boolean },
  sounds: Sounds,
) {
  if (g.gameState !== "playing") return;

  const { paddle, ball } = g;

  if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
  if (keys.right)
    paddle.x = Math.min(CANVAS_W - paddle.w, paddle.x + PADDLE_SPEED * dt);

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
    playSound(sounds.bounce);
  }
  if (ball.x + ball.w >= CANVAS_W) {
    ball.x = CANVAS_W - ball.w;
    ball.vx = -Math.abs(ball.vx);
    playSound(sounds.bounce);
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
    playSound(sounds.bounce);
  }

  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + 8
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
    playSound(sounds.bounce);
  }

  for (const block of g.blocks) {
    if (!block.alive) continue;
    if (collideAABB(ball, block)) {
      block.alive = false;
      g.explosions.push({
        x: block.x,
        y: block.y,
        w: block.w,
        h: block.h,
        color: block.color,
        elapsed: 0,
      });
      g.score += 10;
      ball.vy = -ball.vy;
      playSound(sounds.breakBlock);
      if (g.blocks.every((b) => !b.alive)) {
        if (g.currentLevel < 5) loadLevel(g, g.currentLevel + 1);
        else g.gameState = "win";
      }
      break;
    }
  }

  for (const exp of g.explosions) exp.elapsed += dt * 1000;
  g.explosions = g.explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

  if (ball.y > CANVAS_H) {
    g.lives--;
    if (g.lives <= 0) {
      g.lives = 0;
      g.gameState = "gameover";
    } else {
      resetBall(ball, paddle, LEVELS[g.currentLevel - 1]);
    }
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  sprite: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh, x, y, w, h);
}

function drawOverlay(ctx: CanvasRenderingContext2D, message: string) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(message, CANVAS_W / 2, CANVAS_H / 2);
}

function draw(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  g: GameState,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  for (const block of g.blocks) {
    if (block.alive)
      drawSprite(
        ctx,
        img,
        SPRITES.blocks[block.color],
        block.x,
        block.y,
        block.w,
        block.h,
      );
  }

  for (const exp of g.explosions) {
    const frameIndex = Math.min(
      Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
      3,
    );
    drawSprite(
      ctx,
      img,
      EXPLOSION_FRAMES[exp.color][frameIndex],
      exp.x,
      exp.y,
      exp.w,
      exp.h,
    );
  }

  drawSprite(
    ctx,
    img,
    SPRITES.paddle,
    g.paddle.x,
    g.paddle.y,
    g.paddle.w,
    g.paddle.h,
  );
  drawSprite(ctx, img, SPRITES.ball, g.ball.x, g.ball.y, g.ball.w, g.ball.h);

  if (g.gameState === "playing") {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Score: " + g.score, 10, 10);
    ctx.textAlign = "center";
    ctx.fillText("Nivel: " + g.currentLevel, CANVAS_W / 2, 10);
    const ballSize = 16;
    const ballSpacing = 4;
    for (let i = 0; i < g.lives; i++) {
      const bx = CANVAS_W - 10 - (g.lives - i) * (ballSize + ballSpacing);
      drawSprite(ctx, img, SPRITES.ball, bx, 10, ballSize, ballSize);
    }
  }

  if (g.gameState === "gameover") drawOverlay(ctx, "GAME OVER");
  if (g.gameState === "win") drawOverlay(ctx, "¡COMPLETASTE EL JUEGO!");
}

export interface ArkanoidGameProps {
  paused: boolean;
  restartSignal: number;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

export default function ArkanoidGame({
  paused,
  restartSignal,
  onStateChange,
  onGameOver,
}: ArkanoidGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const pausedRef = useRef(paused);
  const onStateChangeRef = useRef(onStateChange);
  const onGameOverRef = useRef(onGameOver);
  const keysRef = useRef({ left: false, right: false });
  const spriteImgRef = useRef<HTMLImageElement | null>(null);
  const spriteReadyRef = useRef(false);
  const soundsRef = useRef<Sounds>({ bounce: null, breakBlock: null });
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
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        keysRef.current.left = true;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        keysRef.current.right = true;
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    let cancelled = false;

    soundsRef.current.bounce = new window.Audio(
      "/sounds/arkanoid/ball-bounce.mp3",
    );
    soundsRef.current.breakBlock = new window.Audio(
      "/sounds/arkanoid/break-sound.mp3",
    );

    const img = new window.Image();
    img.onload = () => {
      if (cancelled) return;
      spriteImgRef.current = img;
      spriteReadyRef.current = true;
    };
    img.src =
      typeof spritesheetSrc === "string" ? spritesheetSrc : spritesheetSrc.src;

    function loop(ts: number) {
      if (!ctx) return;
      if (!gameRef.current) gameRef.current = createGameState();
      const g = gameRef.current;

      if (spriteReadyRef.current) {
        if (!pausedRef.current && g.gameState === "playing") {
          const dt = g.lastTime === null ? 0 : (ts - g.lastTime) / 1000;
          g.lastTime = ts;
          update(g, Math.min(dt, 0.05), keysRef.current, soundsRef.current);
          onStateChangeRef.current({
            score: g.score,
            lives: g.lives,
            level: g.currentLevel,
          });
          if (g.gameState !== "playing" && !g.gameOverFired) {
            g.gameOverFired = true;
            onGameOverRef.current(g.score);
          }
        } else {
          g.lastTime = null;
        }
        draw(ctx, spriteImgRef.current as HTMLImageElement, g);
      }

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
