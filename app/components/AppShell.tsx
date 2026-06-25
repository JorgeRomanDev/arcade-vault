'use client';

import { useState, useEffect } from 'react';
import Nav from './Nav';
import type { User } from '@/app/data';

export interface Route {
  name: string;
  id?: string;
}

export default function AppShell() {
  const [route, setRoute] = useState<Route>({ name: 'library' });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('av_user');
    if (stored) {
      try { setUser(JSON.parse(stored) as User); } catch { /* ignore */ }
    }
  }, []);

  function navigate(next: Route) {
    setRoute(next);
    window.scrollTo(0, 0);
  }

  function signOut() {
    localStorage.removeItem('av_user');
    setUser(null);
    setRoute({ name: 'library' });
  }

  function renderScreen() {
    // screens wired in step 10
    switch (route.name) {
      default:
        return (
          <main className="av-main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 32px' }}>
            <p className="pixel neon-cyan" style={{ fontSize: 14 }}>CARGANDO VAULT…</p>
          </main>
        );
    }
  }

  return (
    <>
      <Nav route={route} navigate={navigate} user={user} onSignOut={signOut} />
      {renderScreen()}
    </>
  );
}
