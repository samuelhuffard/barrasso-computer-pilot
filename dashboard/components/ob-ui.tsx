'use client';

// Shared UI primitives, ported from Aide.ai's chat-ui design system.

export function Pill({ kind, children }: { kind?: string; children: React.ReactNode }) {
  return <span className={`pill ${kind ?? ''}`}>{children}</span>;
}

export function ConfBar({ conf }: { conf: number }) {
  const pct = Math.round(conf * 100);
  return (
    <span className="confidence">
      <span className="bar"><i style={{ width: `${pct}%` }} /></span>
      <span>{pct}%</span>
    </span>
  );
}

const Ico = ({ d, s = 1.6 }: { d: string; s?: number }) => (
  <svg className="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor"
       strokeWidth={s} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

export const Icons = {
  search:   <Ico d="m11 11 2.5 2.5 M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />,
  filter:   <Ico d="M2.5 3.5h11l-4 5v4l-3 1V8.5l-4-5Z" />,
  refresh:  <Ico d="M3.5 8.5a4.5 4.5 0 0 0 8.3 2.3 M12.5 7.5a4.5 4.5 0 0 0-8.3-2.3 M11 4.5h2v-2 M5 11.5H3v2" />,
  check:    <Ico d="m3 8 3 3 7-7" s={2} />,
  x:        <Ico d="m4 4 8 8 M12 4l-8 8" />,
};

// Mirrors the category enum in triage.js's SYSTEM_PROMPT / evaluation.js's CATEGORIES.
export const CATEGORY_LABELS: Record<string, string> = {
  casework:        'Casework',
  policy_opinion:  'Policy Opinion',
  threat_or_safety:'Threat / Safety',
  administrative:  'Administrative',
  other:           'Other',
};

// Mirrors the priority enum in triage.js's SYSTEM_PROMPT.
export const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  normal:   'Normal',
  low:      'Low',
};

export function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
