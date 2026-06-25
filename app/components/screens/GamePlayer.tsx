'use client';

import { useState, useEffect, useRef } from 'react';
import { GAMES, type User } from '@/app/data';
import type { Route } from '@/app/components/AppShell';

interface GamePlayerProps {
  id: string;
  navigate: (route: Route) => void;
  user: User | null;
}

type SavedScore = { game: string; score: number; name: string; at: number };

export default function GamePlayer({ id, navigate, user }: GamePlayerProps) {
  const game = GAMES.find((g) => g.id === id);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [initials, setInitials] = useState(user?.name ?? '');
  const [saved, setSaved] = useState(false);

  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    if (paused || gameOver) return;
    const id = setInterval(() => {
      setScore((s) => {
        const next = s + 10;
        setLevel(Math.floor(next / 5000) + 1);
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [paused, gameOver]);

  function togglePause() {
    setPaused((p) => !p);
  }

  function triggerGameOver() {
    setGameOver(true);
    setPaused(false);
  }

  function reset() {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setGameOver(false);
    setSaved(false);
    setInitials(user?.name ?? '');
  }

  function saveScore() {
    const entry: SavedScore = {
      game: id,
      score: scoreRef.current,
      name: initials.toUpperCase().slice(0, 10) || 'AAA',
      at: Date.now(),
    };
    try {
      const existing: SavedScore[] = JSON.parse(localStorage.getItem('av_scores') || '[]');
      localStorage.setItem('av_scores', JSON.stringify([...existing, entry]));
    } catch { /* ignore */ }
    setSaved(true);
  }

  if (!game) {
    return (
      <main className="av-main" style={{ padding: '80px 32px', textAlign: 'center' }}>
        <p className="pixel neon-magenta" style={{ fontSize: 12 }}>JUEGO NO ENCONTRADO</p>
        <button className="btn" style={{ marginTop: 24 }} onClick={() => navigate({ name: 'library' })}>
          ← VOLVER AL VAULT
        </button>
      </main>
    );
  }

  return (
    <main className="av-main">
      <div className="av-player">
        {/* HUD */}
        <div className="player-hud">
          <div className="hud-stat">
            <span className="l">SCORE</span>
            <span className="v">{score.toLocaleString().padStart(6, '0')}</span>
          </div>
          <div className="hud-stat lives">
            <span className="l">VIDAS</span>
            <span className="v">{'♥ '.repeat(lives).trim()}</span>
          </div>
          <div className="hud-stat level">
            <span className="l">NIVEL</span>
            <span className="v">{String(level).padStart(2, '0')}</span>
          </div>
          {user && (
            <div className="hud-stat">
              <span className="l">JUGADOR</span>
              <span className="v" style={{ fontSize: 12 }}>{user.name}</span>
            </div>
          )}
          <div className="hud-actions">
            <button className="btn ghost" onClick={togglePause}>
              {paused ? 'REANUDAR' : 'PAUSA'}
            </button>
            <button className="btn magenta" onClick={triggerGameOver}>
              FIN
            </button>
            <button className="btn ghost" onClick={() => navigate({ name: 'library' })}>
              SALIR
            </button>
          </div>
        </div>

        {/* CRT */}
        <div className="crt">
          <div className="crt-screen">
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="player-ship" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
            </div>

            {paused && (
              <div className="crt-content" style={{ background: 'rgba(0,0,0,0.65)', zIndex: 10 }}>
                <div>
                  <p className="pixel neon-yellow" style={{ fontSize: 18, marginBottom: 24 }}>PAUSA</p>
                  <button className="btn lg" onClick={togglePause}>REANUDAR</button>
                </div>
              </div>
            )}
          </div>

          <div className="crt-bottom">
            <span className="led">{game.title}</span>
            <span>© ARCADE VAULT 2025</span>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {gameOver && (
        <div className="modal-bd">
          <div className="modal">
            <h2>GAME OVER</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString()}</div>

            <div className="input-row">
              <input
                type="text"
                placeholder="TUS INICIALES"
                maxLength={10}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
              />
            </div>

            {saved && (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}

            <div className="actions">
              {!saved && (
                <button className="btn yellow" onClick={saveScore}>
                  GUARDAR PUNTUACIÓN
                </button>
              )}
              <button className="btn" onClick={reset}>
                JUGAR DE NUEVO
              </button>
              <button className="btn ghost" onClick={() => navigate({ name: 'library' })}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
