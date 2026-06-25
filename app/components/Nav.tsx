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

const LINKS = [
  { label: 'BIBLIOTECA', name: 'library' },
  { label: 'SALÓN DE LA FAMA', name: 'hall' },
];

export default function Nav({ route, navigate, user, onSignOut }: NavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  function closeDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <nav className="av-nav">
        <div className="logo" onClick={() => navigate({ name: 'library' })}>
          <div className="logo-mark" />
          <span className="logo-text neon-cyan">ARCADE VAULT</span>
        </div>

        <div className="links">
          {LINKS.map((l) => (
            <a
              key={l.name}
              className={route.name === l.name ? 'active' : ''}
              onClick={() => navigate({ name: l.name })}
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <div className="coin" />
          <span>CRÉDITOS: 03</span>
        </div>

        <div className="auth-btn">
          {user ? (
            <button className="btn ghost" onClick={onSignOut}>
              {user.name} ▸ SALIR
            </button>
          ) : (
            <button className="btn" onClick={() => navigate({ name: 'auth' })}>
              INICIAR SESIÓN
            </button>
          )}
        </div>

        <button
          className="btn ghost hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </nav>

      <div
        className={`av-mobile-backdrop${drawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
      />

      <div className={`av-mobile-panel${drawerOpen ? ' open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn ghost" onClick={closeDrawer} aria-label="Cerrar menú">
            ✕
          </button>
        </div>

        {LINKS.map((l) => (
          <a
            key={l.name}
            className={route.name === l.name ? 'active' : ''}
            onClick={() => { navigate({ name: l.name }); closeDrawer(); }}
          >
            {l.label}
          </a>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          {user ? (
            <button
              className="btn ghost"
              style={{ width: '100%' }}
              onClick={() => { onSignOut(); closeDrawer(); }}
            >
              {user.name} ▸ SALIR
            </button>
          ) : (
            <button
              className="btn"
              style={{ width: '100%' }}
              onClick={() => { navigate({ name: 'auth' }); closeDrawer(); }}
            >
              INICIAR SESIÓN
            </button>
          )}
        </div>
      </div>
    </>
  );
}
