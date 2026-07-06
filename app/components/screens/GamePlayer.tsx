"use client";

import { useState, useEffect } from "react";
import type { Game, User } from "@/app/data";
import { getGame } from "@/app/lib/games";
import type { Route } from "@/app/components/AppShell";
import AsteroidsGame from "@/app/components/games/AsteroidsGame";
import TetrisGame from "@/app/components/games/TetrisGame";
import ArkanoidGame from "@/app/components/games/ArkanoidGame";

interface GamePlayerProps {
  id: string;
  user: User | null;
  navigate: (route: Route) => void;
  onSaveScore: (entry: {
    game: string;
    score: number;
    name: string;
  }) => Promise<void>;
}

export default function GamePlayer({
  id,
  user,
  navigate,
  onSaveScore,
}: GamePlayerProps) {
  const [game, setGame] = useState<Game | null>(null);
  const isAsteroides = id === "asteroides";
  const isTetris = id === "tetris";
  const isArkanoid = id === "arkanoid";
  const isCustomGame = isAsteroides || isTetris || isArkanoid;
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user ? user.name : "INVITADO");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [restartCount, setRestartCount] = useState(0);

  useEffect(() => {
    getGame(id).then(setGame);
  }, [id]);

  useEffect(() => {
    if (isCustomGame || over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [isCustomGame, over, paused]);

  useEffect(() => {
    (() => {
      if (isCustomGame) return;
      if (score > 0 && score % 2500 < 100) setLevel((l) => l + 1);
    })();
  }, [isCustomGame, score]);

  function endGame() {
    setOver(true);
  }
  function restart() {
    setScore(0);
    setLives(3);
    setLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(null);
    setRestartCount((c) => c + 1);
  }

  if (!game) return null;

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => navigate({ name: "detalle", id: game.id })}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroides ? (
            <AsteroidsGame
              paused={paused}
              restartSignal={restartCount}
              onStateChange={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setLevel(s.level);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : isTetris ? (
            <TetrisGame
              paused={paused}
              restartSignal={restartCount}
              onStateChange={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setLevel(s.level);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : isArkanoid ? (
            <ArkanoidGame
              paused={paused}
              restartSignal={restartCount}
              onStateChange={(s) => {
                setScore(s.score);
                setLives(s.lives);
                setLevel(s.level);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor" />
              <div className="enemy e1" />
              <div className="enemy e2" />
              <div className="enemy e3" />
              <div className="player-ship" />
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={() => {
                    setSaveError(null);
                    onSaveScore({ game: game.id, score, name })
                      .then(() => setSaved(true))
                      .catch(() =>
                        setSaveError("No se pudo guardar la puntuación."),
                      );
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
                {saveError && (
                  <div
                    className="toast-saved"
                    style={{ color: "var(--magenta)" }}
                  >
                    ▸ {saveError}
                  </div>
                )}
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => navigate({ name: "games" })}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
