"use client";

import { useState } from "react";
import type { User } from "@/app/data";
import type { Route } from "@/app/components/AppShell";
import { createClient } from "@/app/lib/supabase/client";

interface AuthProps {
  navigate: (route: Route) => void;
  onLogin: (user: User) => void;
}

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PASSWORD_ERROR =
  "La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, minúscula, número y símbolo.";

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

export default function Auth({ navigate, onLogin }: AuthProps) {
  const [tab, setTab] = useState<"in" | "up">("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();

    if (tab === "in") {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password: pass });
      setBusy(false);
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (data.user) {
        onLogin(deriveUser(data.user));
        navigate({ name: "games" });
      }
      return;
    }

    if (!PASSWORD_REGEX.test(pass)) {
      setError(PASSWORD_ERROR);
      setBusy(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { username: (user || "PLAYER1").toUpperCase().slice(0, 10) },
      },
    });
    setBusy(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session && data.user) {
      onLogin(deriveUser(data.user));
      navigate({ name: "games" });
      return;
    }
    setCheckEmail(true);
  }

  async function oauth(provider: "google" | "github") {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setError(oauthError.message);
    }
  }

  if (checkEmail) {
    return (
      <div className="av-auth-wrap fade-in">
        <div className="auth-card">
          <div className="auth-header">
            <div className="mark" />
            <h2 className="neon-cyan">ARCADE VAULT</h2>
          </div>
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--ink)",
            }}
          >
            REVISA TU CORREO PARA CONFIRMAR TU CUENTA
          </div>
          <button
            className="btn ghost"
            style={{ width: "100%" }}
            onClick={() => {
              setCheckEmail(false);
              setTab("in");
            }}
          >
            VOLVER A INICIAR SESIÓN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === "in" ? "on" : ""}
            onClick={() => {
              setTab("in");
              setError(null);
            }}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === "up" ? "on" : ""}
            onClick={() => {
              setTab("up");
              setError(null);
            }}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          {tab === "up" && (
            <div className="field slide-in">
              <label>Usuario</label>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="px_kai"
              />
            </div>
          )}
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jugador@vault.gg"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div
              style={{
                color: "var(--danger, #ff4d6d)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            disabled={busy}
            style={{ width: "100%", marginTop: 8 }}
          >
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => {
            onLogin({ name: "INVITADO", isGuest: true });
            navigate({ name: "games" });
          }}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("github")}
          >
            ▣ GITHUB
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
