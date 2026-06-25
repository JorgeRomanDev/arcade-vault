'use client';

import { GAMES, seededScores } from '@/app/data';
import type { Route } from '@/app/components/AppShell';

interface GameDetailProps {
  id: string;
  navigate: (route: Route) => void;
}

function strSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function GameDetail({ id, navigate }: GameDetailProps) {
  const game = GAMES.find((g) => g.id === id);

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

  const scores = seededScores(strSeed(game.id), 10);

  return (
    <main className="av-main">
      <div className="av-detail">
        {/* Left column */}
        <div>
          <div className="detail-cover">
            <div className={`cover-bg ${game.cover}`} style={{ position: 'absolute', inset: 0 }} />
          </div>

          <div className="detail-info" style={{ marginTop: 24 }}>
            <h2 className={`neon-${game.color}`}>{game.title}</h2>

            <div className="detail-tags">
              <span>{game.cat}</span>
              <span>1 JUGADOR</span>
              <span>HIGH SCORE</span>
            </div>

            <p>{game.long}</p>

            <div className="stat-strip">
              <div>
                <div className="l">MEJOR MARCA</div>
                <div className="v">{game.best.toLocaleString()}</div>
              </div>
              <div>
                <div className="l">PARTIDAS</div>
                <div className="v">{game.plays}</div>
              </div>
              <div>
                <div className="l">RANKING</div>
                <div className="v">#1</div>
              </div>
            </div>

            <div className="detail-actions">
              <button
                className={`btn lg${game.color === 'magenta' ? ' magenta' : game.color === 'yellow' ? ' yellow' : ''} pulse`}
                onClick={() => navigate({ name: 'player', id: game.id })}
              >
                ▶ JUGAR AHORA
              </button>
              <button className="btn ghost" onClick={() => navigate({ name: 'library' })}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>

        {/* Right column: leaderboard */}
        <div className="leaderboard">
          <h3>▸ TOP SCORES</h3>
          {scores.map((row) => (
            <div
              key={row.rank}
              className={`lb-row${row.rank === 1 ? ' top1' : row.rank === 2 ? ' top2' : row.rank === 3 ? ' top3' : ''}`}
            >
              <span className="rk">#{row.rank}</span>
              <span className="pl">{row.name}</span>
              <span className="sc">{row.score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
