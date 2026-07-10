"use client";

import { useState, useEffect } from "react";
import Nav from "./Nav";
import Library from "./screens/Library";
import GameDetail from "./screens/GameDetail";
import GamePlayer from "./screens/GamePlayer";
import Auth from "./screens/Auth";
import HallOfFame from "./screens/HallOfFame";
import Home from "./screens/Home";
import About from "./screens/About";
import type { User } from "@/app/data";
import { saveScore } from "@/app/lib/games";

export interface Route {
  name: string;
  id?: string;
}

export default function AppShell() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (() => {
      try {
        setUser(
          JSON.parse(localStorage.getItem("av_user") || "null") as User | null,
        );
      } catch {
        /* ignore */
      }
    })();
  }, []);

  function navigate(next: Route) {
    setRoute(next);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }

  useEffect(() => {
    document.body.dataset.route = route.name;
  }, [route.name]);

  function handleLogin(u: User) {
    setUser(u);
    localStorage.setItem("av_user", JSON.stringify(u));
  }

  function handleSignOut() {
    setUser(null);
    localStorage.removeItem("av_user");
  }

  async function handleSaveScore(entry: {
    game: string;
    score: number;
    name: string;
  }) {
    await saveScore({
      gameId: entry.game,
      name: entry.name,
      score: entry.score,
    });
  }

  function renderScreen() {
    switch (route.name) {
      case "home":
        return <Home navigate={navigate} />;
      case "games":
        return <Library navigate={navigate} />;
      case "detalle":
        return <GameDetail id={route.id ?? ""} navigate={navigate} />;
      case "player":
        return (
          <GamePlayer
            id={route.id ?? ""}
            user={user}
            navigate={navigate}
            onSaveScore={handleSaveScore}
          />
        );
      case "auth":
        return <Auth navigate={navigate} onLogin={handleLogin} />;
      case "salon":
        return <HallOfFame user={user} navigate={navigate} />;
      case "about":
        return <About navigate={navigate} />;
      default:
        return <Home navigate={navigate} />;
    }
  }

  return (
    <>
      <Nav
        route={route}
        navigate={navigate}
        user={user}
        onSignOut={handleSignOut}
      />
      <main className="av-main">{renderScreen()}</main>
      <footer
        className="av-footer"
        style={{
          borderTop: "1px solid var(--line)",
          padding: "20px 32px",
          textAlign: "center",
          color: "var(--ink-faint)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
        }}
      >
        © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
      </footer>
    </>
  );
}
