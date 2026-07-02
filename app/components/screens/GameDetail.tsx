"use client";

import { useEffect, useState } from "react";
import type { Game, ScoreRow } from "@/app/data";
import { getGame, getGameStats, getTopScores } from "@/app/lib/games";
import type { Route } from "@/app/components/AppShell";

interface GameDetailProps {
  id: string;
  navigate: (route: Route) => void;
}

export default function GameDetail({ id, navigate }: GameDetailProps) {
  const [game, setGame] = useState<Game | null>(null);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [stats, setStats] = useState<{ best: number; plays: number }>({
    best: 0,
    plays: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [loadedGame, loadedScores, loadedStats] = await Promise.all([
        getGame(id),
        getTopScores(id, 10),
        getGameStats(id),
      ]);
      if (cancelled) return;
      setGame(loadedGame);
      setScores(loadedScores);
      setStats(loadedStats);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return null;
  if (!game) return null;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover} />
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{stats.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div
                className="v"
                style={{
                  color: "var(--magenta)",
                  textShadow: "0 0 6px rgba(255,0,110,0.5)",
                }}
              >
                {stats.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button
              className="btn xl pulse"
              onClick={() => navigate({ name: "player", id: game.id })}
            >
              ▶ JUGAR AHORA
            </button>
            <button
              className="btn ghost lg"
              onClick={() => navigate({ name: "games" })}
            >
              VOLVER AL VAULT
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.length === 0 && (
            <div style={{ padding: 20, color: "var(--ink-faint)" }}>
              Todavía no hay puntuaciones guardadas.
            </div>
          )}
          {scores.map((r, i) => (
            <div
              key={r.rank}
              className={
                "lb-row" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--ink-faint)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {r.date}
                </div>
              </div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
