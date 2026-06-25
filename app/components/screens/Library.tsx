'use client';

import { useState } from 'react';
import { GAMES, CATS, type Game } from '@/app/data';
import type { Route } from '@/app/components/AppShell';

interface LibraryProps {
  navigate: (route: Route) => void;
}

function GameCard({ game, navigate }: { game: Game; navigate: (route: Route) => void }) {
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const rotY = ((x - cx) / cx) * 9;
    const rotX = -((y - cy) / cy) * 6;
    e.currentTarget.style.transform =
      `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLDivElement>) {
    e.currentTarget.style.transform = '';
  }

  return (
    <div
      className="card fade-in"
      onClick={() => navigate({ name: 'detail', id: game.id })}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="cover">
        <div className={`cover-bg ${game.cover}`} />
        <div className="label">{game.cat}</div>
      </div>

      <div className="meta">
        <div className="title">{game.title}</div>
        <div className="desc">{game.short}</div>
        <div className="row">
          <div className="score-badge">
            <span>MEJOR MARCA</span>
            <b>{game.best.toLocaleString()}</b>
          </div>
          <button
            className={`btn ${game.color === 'magenta' ? 'magenta' : game.color === 'yellow' ? 'yellow' : ''}`}
            style={{ fontSize: 9, padding: '8px 14px' }}
            onClick={(e) => { e.stopPropagation(); navigate({ name: 'detail', id: game.id }); }}
          >
            JUGAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Library({ navigate }: LibraryProps) {
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('TODOS');

  const filtered = GAMES.filter((g) => {
    const matchCat = activeCat === 'TODOS' || g.cat === activeCat;
    const matchSearch = g.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <main className="av-main">
      <div className="av-hero">
        <h1>ARCADE VAULT</h1>
        <p className="sub">
          INSERT COIN TO <span className="blink">PLAY_</span>
        </p>
      </div>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico">▸</span>
          <input
            type="text"
            placeholder="BUSCAR JUEGO…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="av-chips">
          {CATS.map((cat) => (
            <button
              key={cat}
              className={`chip${activeCat === cat ? ' active' : ''}`}
              onClick={() => setActiveCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 32px' }}>
          <p className="pixel neon-magenta" style={{ fontSize: 12 }}>NO HAY RESULTADOS</p>
          <p style={{ color: 'var(--ink-faint)', marginTop: 12, fontFamily: 'var(--mono)', fontSize: 13 }}>
            Prueba con otra búsqueda o categoría
          </p>
        </div>
      ) : (
        <div className="av-grid">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} navigate={navigate} />
          ))}
        </div>
      )}
    </main>
  );
}
