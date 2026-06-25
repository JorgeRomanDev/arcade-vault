'use client';

import { useState } from 'react';
import type { User } from '@/app/data';

interface Route {
  name: string;
  id?: string;
}

interface NavProps {
  route: Route;
  navigate: (route: Route) => void;
  user: User | null;
  onSignOut: () => void;
}

export default function Nav({ route, navigate, user, onSignOut }: NavProps) {
  const [open, setOpen] = useState(false);

  const isActive = (name: string) =>
    route.name === name ||
    (name === 'biblioteca' && route.name === 'detalle') ||
    (name === 'biblioteca' && route.name === 'player');

  const go = (r: Route) => { setOpen(false); navigate(r); };

  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => go({ name: 'biblioteca' })}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </div>

        <div className="links">
          <a className={isActive('biblioteca') ? 'active' : ''} onClick={() => go({ name: 'biblioteca' })}>
            Biblioteca
          </a>
          <a className={isActive('salon') ? 'active' : ''} onClick={() => go({ name: 'salon' })}>
            Salón de la Fama
          </a>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button className="btn ghost auth-btn" onClick={onSignOut}>{user.name} ▾</button>
        ) : (
          <button className="btn auth-btn" onClick={() => go({ name: 'auth' })}>Iniciar Sesión</button>
        )}

        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">≡</button>
      </nav>

      <div className={`av-mobile-backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`av-mobile-panel${open ? ' open' : ''}`}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <a className={isActive('biblioteca') ? 'active' : ''} onClick={() => go({ name: 'biblioteca' })}>Biblioteca</a>
        <a className={isActive('salon') ? 'active' : ''} onClick={() => go({ name: 'salon' })}>Salón de la Fama</a>
        <a className={isActive('auth') ? 'active' : ''} onClick={() => go({ name: 'auth' })}>
          {user ? 'Cuenta' : 'Iniciar Sesión'}
        </a>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.16em' }}>CRÉDITOS · 03</div>
      </aside>
    </>
  );
}
