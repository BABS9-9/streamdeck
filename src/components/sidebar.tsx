'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

const nav = [
  ['/', 'Login'],
  ['/home', 'Home'],
  ['/live', 'Live TV'],
  ['/favorites', 'Favorites'],
  ['/continue', 'Continue Watching'],
  ['/search', 'Search'],
  ['/movies', 'Movies'],
  ['/series', 'Series'],
  ['/settings', 'Settings'],
];

const statusTone: Record<string, string> = {
  idle: 'text-slate-400',
  checking: 'text-amber-300',
  healthy: 'text-emerald-300',
  degraded: 'text-amber-300',
  error: 'text-rose-300',
};

export function Sidebar() {
  const pathname = usePathname();
  const activeConnection = useAuthStore((state) => state.activeConnection);
  const connections = useAuthStore((state) => state.connections);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const activeStatus = activeConnection ? connectionStatus[activeConnection.id] : null;

  return (
    <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/30 p-6 lg:flex lg:flex-col">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-violet-300">BABcorp</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">StreamDeck</h1>
        <p className="mt-2 text-sm text-slate-400">IPTV, without the jank.</p>
      </div>

      <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Active provider</p>
        <p className="mt-2 text-lg font-semibold text-white">{activeConnection?.name ?? 'Not connected'}</p>
        <p className="mt-1 text-sm text-slate-400">{activeConnection?.username ?? 'Connect on the login screen'}</p>
        <p className={`mt-3 text-xs uppercase tracking-[0.22em] ${activeStatus ? statusTone[activeStatus.state] : 'text-slate-500'}`}>
          {activeStatus ? `${activeStatus.state}${activeStatus.serverTime ? ` · ${activeStatus.serverTime}` : ''}` : 'Status pending'}
        </p>
        <p className="mt-2 text-xs text-slate-500">{connections.length} saved connection{connections.length === 1 ? '' : 's'}</p>
      </div>

      <nav className="mt-10 space-y-2">
        {nav.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center rounded-2xl px-4 py-3 text-sm transition ${active ? 'bg-violet-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-black/20 p-4 text-sm text-slate-400">
        <p className="font-medium text-white">Phase 1 prototype</p>
        <p className="mt-2 leading-6">Login, home, live browser, favorites, continue watching, cross-provider search, saved providers, and stream health are live in the current shell.</p>
      </div>
    </aside>
  );
}
