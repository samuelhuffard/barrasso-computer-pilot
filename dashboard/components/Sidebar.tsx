'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Icon({ name, size = 17, stroke = 1.6, style }: { name: string; size?: number; stroke?: number; style?: React.CSSProperties }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style };
  const paths: Record<string, React.ReactNode> = {
    folder: <path d="M3.5 6.5h6l2 2.5h9V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19z" />,
    chart:  <><path d="M4 21V10" /><path d="M10 21V4" /><path d="M16 21v-7" /><path d="M3 21h18" /></>,
  };
  return <svg {...p}>{paths[name] ?? null}</svg>;
}

const NAV: { href: string; label: string; icon: string }[] = [
  { href: '/', label: 'Correspondence', icon: 'folder' },
  { href: '/insights', label: 'Insights', icon: 'chart' },
];

function SysRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="sb-sys-row">
      <span style={{ color: 'var(--muted)', letterSpacing: '0.1em' }}>{k}</span>
      <span style={{ color: accent ? 'var(--accent)' : 'var(--text-2)' }} className="tnum">{v}</span>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch('/api/health');
        const d = await r.json();
        setHealthy(r.ok && d.status === 'ok');
      } catch {
        setHealthy(false);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="sb">
      <div className="sb-brand">
        <div className="sb-mark">BC</div>
        <div>
          <div className="sb-name">Barrasso Triage</div>
          <div className="label" style={{ marginTop: 3 }}>LOCAL PILOT · WY</div>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-section">WORKSPACE</div>
        {NAV.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="sb-item" data-active={active ? 'true' : 'false'}>
              {active && <span className="sb-active-bar" />}
              <Icon name={icon} size={17} style={{ opacity: active ? 0.95 : 0.62, color: active ? 'var(--accent)' : 'currentColor' }} />
              <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sb-systems card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <span className="label">SYSTEMS</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} className="mono">
            <span className="dot" style={healthy === false ? { background: 'var(--err)' } : undefined} />
            <span style={{ fontSize: 10, color: healthy === false ? 'var(--err)' : 'var(--accent)', letterSpacing: '0.08em' }}>
              {healthy === false ? 'DEGRADED' : 'OPERATIONAL'}
            </span>
          </span>
        </div>
        <SysRow k="MODEL" v="LLAMA3.2:3B" />
        <SysRow k="SOURCE" v="FOLDER WATCH" />
        <SysRow k="AUDIT" v="ON" accent />
      </div>
    </aside>
  );
}
