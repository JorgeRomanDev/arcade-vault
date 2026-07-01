"use client";

import { useEffect, useRef } from "react";

const W = 800;
const H = 600;

const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

interface InputState {
  keys: Record<string, boolean>;
  justPressed: Record<string, boolean>;
}

function pressed(input: InputState, code: string) {
  const val = input.justPressed[code];
  input.justPressed[code] = false;
  return val;
}

class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  radius: number;
  dead: boolean;

  constructor(x: number, y: number, angle: number) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead: boolean;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

class Ship {
  x = 0;
  y = 0;
  angle = 0;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;

  constructor() {
    this.reset();
  }

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, input: InputState) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (input.keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (input.keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!input.keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.dead) return;
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
    ctx.closePath();
    ctx.stroke();

    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = "rgba(255, 130, 0, 0.85)";
      ctx.stroke();
    }

    ctx.restore();
  }
}

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead: boolean;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
    this.dead = false;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

type Phase = "playing" | "dead" | "gameover";

interface GameState {
  ship: Ship;
  bullets: Bullet[];
  asteroids: Asteroid[];
  particles: Particle[];
  score: number;
  lives: number;
  level: number;
  phase: Phase;
  deadTimer: number;
  lastTime: number | null;
  gameOverFired: boolean;
}

function spawnAsteroids(g: GameState, count: number) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x = 0;
    let y = 0;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    g.asteroids.push(new Asteroid(x, y, 3));
  }
}

function createGameState(): GameState {
  const g: GameState = {
    ship: new Ship(),
    bullets: [],
    asteroids: [],
    particles: [],
    score: 0,
    lives: 3,
    level: 1,
    phase: "playing",
    deadTimer: 0,
    lastTime: null,
    gameOverFired: false,
  };
  spawnAsteroids(g, 4);
  return g;
}

function nextLevel(g: GameState) {
  g.level++;
  g.bullets = [];
  g.particles = [];
  g.ship.reset();
  spawnAsteroids(g, 3 + g.level);
}

function explode(g: GameState, x: number, y: number, count = 8) {
  for (let i = 0; i < count; i++) g.particles.push(new Particle(x, y));
}

function killShip(g: GameState) {
  explode(g, g.ship.x, g.ship.y, 14);
  g.ship.dead = true;
  g.lives--;
  if (g.lives <= 0) {
    g.phase = "gameover";
  } else {
    g.phase = "dead";
    g.deadTimer = 2;
  }
}

function updateGame(g: GameState, input: InputState, dt: number) {
  if (g.phase === "gameover") {
    g.particles.forEach((p) => p.update(dt));
    g.particles = g.particles.filter((p) => !p.dead);
    return;
  }

  if (g.phase === "dead") {
    g.deadTimer -= dt;
    g.particles.forEach((p) => p.update(dt));
    g.particles = g.particles.filter((p) => !p.dead);
    g.asteroids.forEach((a) => a.update(dt));
    if (g.deadTimer <= 0) {
      g.phase = "playing";
      g.ship.reset();
    }
    return;
  }

  if (pressed(input, "Space")) {
    g.bullets.push(...g.ship.tryShoot());
  }

  g.ship.update(dt, input);
  g.bullets.forEach((b) => b.update(dt));
  g.asteroids.forEach((a) => a.update(dt));
  g.particles.forEach((p) => p.update(dt));

  g.bullets = g.bullets.filter((b) => !b.dead);
  g.particles = g.particles.filter((p) => !p.dead);

  const newAsteroids: Asteroid[] = [];
  for (const b of g.bullets) {
    for (const a of g.asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        g.score += POINTS[a.size];
        explode(g, a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  g.asteroids = g.asteroids.filter((a) => !a.dead).concat(newAsteroids);
  g.bullets = g.bullets.filter((b) => !b.dead);

  if (g.ship.invincible <= 0) {
    for (const a of g.asteroids) {
      if (dist(g.ship, a) < g.ship.radius + a.radius * 0.82) {
        killShip(g);
        break;
      }
    }
  }

  if (g.asteroids.length === 0) nextLevel(g);
}

function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.2;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = "#fff";
  ctx.font = "15px monospace";

  ctx.textAlign = "left";
  ctx.fillText(`SCORE  ${g.score}`, 14, 26);

  ctx.textAlign = "center";
  ctx.fillText(`NIVEL ${g.level}`, W / 2, 26);

  for (let i = 0; i < g.lives; i++) drawLifeIcon(ctx, W - 16 - i * 22, 18);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  title: string,
  sub: string,
) {
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.font = "bold 46px monospace";
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font = "18px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawGame(ctx: CanvasRenderingContext2D, g: GameState) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  g.particles.forEach((p) => p.draw(ctx));
  g.asteroids.forEach((a) => a.draw(ctx));
  g.bullets.forEach((b) => b.draw(ctx));
  g.ship.draw(ctx);

  drawHUD(ctx, g);

  if (g.phase === "gameover")
    drawOverlay(ctx, "GAME OVER", `PUNTAJE: ${g.score}`);
}

const CONTROL_CODES = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space"];

export interface AsteroidsGameProps {
  paused: boolean;
  restartSignal: number;
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

export default function AsteroidsGame({
  paused,
  restartSignal,
  onStateChange,
  onGameOver,
}: AsteroidsGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState | null>(null);
  const inputRef = useRef<InputState>({ keys: {}, justPressed: {} });
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
      const input = inputRef.current;
      if (!input.keys[e.code]) input.justPressed[e.code] = true;
      input.keys[e.code] = true;
    }
    function handleKeyUp(e: KeyboardEvent) {
      inputRef.current.keys[e.code] = false;
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

    function loop(ts: number) {
      if (!ctx) return;
      if (!gameRef.current) gameRef.current = createGameState();
      const g = gameRef.current;

      if (!pausedRef.current) {
        const dt =
          g.lastTime === null ? 0 : Math.min((ts - g.lastTime) / 1000, 0.05);
        g.lastTime = ts;
        updateGame(g, inputRef.current, dt);
        onStateChangeRef.current({
          score: g.score,
          lives: g.lives,
          level: g.level,
        });
        if (g.phase === "gameover" && !g.gameOverFired) {
          g.gameOverFired = true;
          onGameOverRef.current(g.score);
        }
      } else {
        g.lastTime = null;
      }

      drawGame(ctx, g);
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ maxWidth: "100%", height: "auto", display: "block" }}
    />
  );
}
