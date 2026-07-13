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
import { createClient } from "@/app/lib/supabase/client";

export interface Route {
  name: string;
  id?: string;
}

function deriveUser(supaUser: {
  user_metadata?: { username?: string };
  email?: string;
}): User {
  const username = supaUser.user_metadata?.username;
  const name = (username || supaUser.email?.split("@")[0] || "PLAYER1")
    .toUpperCase()
    .slice(0, 10);
  return { name, email: supaUser.email };
}

export default function AppShell() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(deriveUser(session.user));
        return;
      }
      try {
        const guest = JSON.parse(
          localStorage.getItem("av_guest_user") || "null",
        ) as User | null;
        if (guest?.isGuest) setUser(guest);
      } catch {
        /* ignore */
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(deriveUser(session.user));
      } else {
        setUser((current) => (current?.isGuest ? current : null));
      }
    });

    return () => subscription.unsubscribe();
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
    if (u.isGuest) {
      localStorage.setItem("av_guest_user", JSON.stringify(u));
    }
  }

  async function handleSignOut() {
    if (!user?.isGuest) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    localStorage.removeItem("av_guest_user");
    setUser(null);
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
