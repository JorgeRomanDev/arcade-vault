'use client';

import { useState, useEffect } from 'react';
import { GAMES, seededScores, type User, type ScoreRow } from '@/app/data';
import type { Route } from '@/app/components/AppShell';

interface HallOfFameProps {
  user: User | null;
  navigate: (route: Route) => void;
}

type SavedScore = { game: string; score: number; name: string; at: number };

function strSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

function getScoresForGame(gameId: string): ScoreRow[] {
  return seededScores(strSeed(gameId), 10);
}

function getAllScores(): ScoreRow[] {
  const all: ScoreRow[] = [];
  GAMES.forEach((g) => {
    all.push(...getScoresForGame(g.id));
  });
  return all
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export default function HallOfFame({ user }: HallOfFameProps) {
  const [activeGame, setActiveGame] = useState('TODOS');
  const [userBest, setUserBest] = useState<number | null>(null);

  useEffect(() => {
    if (!user) { setUserBest(null); return; }
    try {
      const saved: SavedScore[] = JSON.parse(localStorage.getItem('av_scores') || '[]');
      const relevant = saved.filter((s) =>
        s.name === user.name &&
        (activeGame === 'TODOS' || s.game === GAMES.find((g) => g.title === activeGame)?.id)
      );
      if (relevant.length === 0) { setUserBest(null); return; }
      setUserBest(Math.max(...relevant.map((s) => s.score)));
    } catch { setUserBest(null); }
  }, [user, activeGame]);

  const rows: ScoreRow[] =
    activeGame === 'TODOS'
      ? getAllScores()
      : getScoresForGame(GAMES.find((g) => g.title === activeGame)?.id ?? '');

  const [silver, gold, bronze] = [rows[1], rows[0], rows[2]];

  function rankClass(rank: number) {
    if (rank === 1) return ' top1';
    if (rank === 2) return ' top2';
    if (rank === 3) return ' top3';
    return '';
  }

  return (
    <main className="av-main">
      <div className="av-hall">
        <div className="hall-head">
          <h1>SALÓN DE LA FAMA</h1>
          <p>LOS MEJORES JUGADORES DEL VAULT</p>
        </div>

        {/* Game chips */}
        <div className="hall-tabs">
          <button
            className={`chip${activeGame === 'TODOS' ? ' active' : ''}`}
            onClick={() => setActiveGame('TODOS')}
          >
            TODOS
          </button>
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={`chip${activeGame === g.title ? ' active' : ''}`}
              onClick={() => setActiveGame(g.title)}
            >
              {g.title}
            </button>
          ))}
        </div>

        {/* Podium: silver | gold | bronze */}
        {rows.length >= 3 && (
          <div className="podium">
            {[silver, gold, bronze].map((row, i) => {
              const cls = i === 0 ? 'silver' : i === 1 ? 'gold' : 'bronze';
              return (
                <div key={row.rank} className={`podium-slot ${cls}`}>
                  <div className="rank-num">
                    {i === 1 ? '1' : i === 0 ? '2' : '3'}
                  </div>
                  <div className="name">{row.name}</div>
                  <div className="score">{row.score.toLocaleString()}</div>
                  <div className="date">{row.date}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full table */}
        <div className="hall-table">
          <div className="th">
            <span>#</span>
            <span>JUGADOR</span>
            <span>PUNTUACIÓN</span>
            <span>FECHA</span>
          </div>

          {rows.map((row, idx) => (
            <div
              key={row.rank}
              className={`tr${rankClass(row.rank)}`}
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <span className="rk">#{row.rank}</span>
              <span className="pl">{row.name}</span>
              <span className="sc">{row.score.toLocaleString()}</span>
              <span className="dt">{row.date}</span>
            </div>
          ))}

          {user && userBest !== null && (
            <>
              <div className="tr you-label">▸ TU MEJOR MARCA</div>
              <div className="tr you">
                <span className="rk">–</span>
                <span className="pl">{user.name}</span>
                <span className="sc">{userBest.toLocaleString()}</span>
                <span className="dt">HOY</span>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
