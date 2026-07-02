"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, ScoreRow, User } from "@/app/data";
import { getAllTopScores, getGames, getTopScores } from "@/app/lib/games";
import type { Route } from "@/app/components/AppShell";

interface HallOfFameProps {
  user: User | null;
  navigate: (route: Route) => void;
}

const ALL_TAB = "TODOS";

export default function HallOfFame({ navigate }: HallOfFameProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [tab, setTab] = useState<string>(ALL_TAB);
  const [rows, setRows] = useState<(ScoreRow & { gameId?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const loadedGames = await getGames();
      setGames(loadedGames);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const loadedRows =
        tab === ALL_TAB
          ? await getAllTopScores(12)
          : await getTopScores(tab, 12);
      if (cancelled) return;
      setRows(loadedRows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const gameTitleById = useMemo(
    () => Object.fromEntries(games.map((g) => [g.id, g.title])),
    [games],
  );

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        <button
          className={"chip" + (tab === ALL_TAB ? " active" : "")}
          onClick={() => setTab(ALL_TAB)}
        >
          {ALL_TAB}
        </button>
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          CARGANDO…
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            color: "var(--ink-faint)",
          }}
        >
          Todavía no hay puntuaciones guardadas.
        </div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">
                  {rows[1].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            {rows[0] && (
              <div className="podium-slot gold">
                <div
                  className="pixel"
                  style={{
                    fontSize: 9,
                    color: "var(--gold)",
                    letterSpacing: "0.18em",
                  }}
                >
                  CAMPEÓN
                </div>
                <div
                  className="rank-num"
                  style={{ fontSize: 36, marginTop: 4 }}
                >
                  01
                </div>
                <div className="name">{rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>
                  {rows[0].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[0].date}</div>
              </div>
            )}
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">
                  {rows[2].score.toLocaleString("es-ES")}
                </div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              {tab === ALL_TAB && <div>JUEGO</div>}
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.rank}
                className={
                  "tr" +
                  (i === 0
                    ? " top1"
                    : i === 1
                      ? " top2"
                      : i === 2
                        ? " top3"
                        : "")
                }
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                {tab === ALL_TAB && (
                  <div className="pl">
                    {r.gameId ? (gameTitleById[r.gameId] ?? r.gameId) : ""}
                  </div>
                )}
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => navigate({ name: "games" })}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
