'use client';

import { useState } from 'react';
import type { User } from '@/app/data';
import type { Route } from '@/app/components/AppShell';

interface AuthProps {
  navigate: (route: Route) => void;
  onLogin: (user: User) => void;
}

export default function Auth({ navigate, onLogin }: AuthProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim().toUpperCase().slice(0, 10);
    if (!trimmed) return;
    const user: User = { name: trimmed };
    try { localStorage.setItem('av_user', JSON.stringify(user)); } catch { /* ignore */ }
    onLogin(user);
    navigate({ name: 'library' });
  }

  return (
    <main className="av-main av-auth-wrap">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark" />
          <h2 className="pixel neon-cyan">ARCADE VAULT</h2>
        </div>

        <div className="auth-tabs">
          <button
            className={tab === 'login' ? 'on' : ''}
            onClick={() => setTab('login')}
          >
            INICIAR SESIÓN
          </button>
          <button
            className={tab === 'register' ? 'on' : ''}
            onClick={() => setTab('register')}
          >
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>NOMBRE DE JUGADOR</label>
            <input
              type="text"
              placeholder="MAX 10 CHARS"
              maxLength={10}
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              autoFocus
            />
          </div>

          {tab === 'register' && (
            <div className="field slide-in">
              <label>EMAIL</label>
              <input
                type="email"
                placeholder="player@arcade.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn pulse"
            style={{ width: '100%', marginTop: 8 }}
          >
            {tab === 'login' ? 'ENTRAR AL VAULT' : 'CREAR CUENTA'}
          </button>
        </form>

        <div className="auth-divider">O CONTINÚA CON</div>

        <div className="social">
          <button className="btn ghost" type="button">▸ GOOGLE</button>
          <button className="btn ghost" type="button">▸ TWITTER</button>
        </div>
      </div>
    </main>
  );
}
