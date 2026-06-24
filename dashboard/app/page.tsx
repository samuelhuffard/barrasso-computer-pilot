'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Pill, CATEGORY_LABELS, PRIORITY_LABELS, fmtDateTime } from '@/components/ob-ui';

type Record_ = {
  id: string;
  receivedAt: string;
  from: string;
  subject: string;
  body: string;
  urgent: boolean;
  priority: string;
  category: string;
  intent: string;
  needs_reply: boolean;
  sentiment: string;
  topics: string[];
  reason: string;
};

const PILL_KIND: Record<string, string> = {
  critical: 'err',
  high: 'warn',
  normal: 'info',
  low: 'ok',
};

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent' },
  ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
];

export default function CorrespondencePage() {
  const [records, setRecords] = useState<Record_[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/correspondence');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load correspondence');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filter === 'urgent' && !r.urgent) return false;
      if (filter !== 'all' && filter !== 'urgent' && r.category !== filter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${r.subject} ${r.from} ${r.reason}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [records, filter, search]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const stats = useMemo(() => ({
    total: records.length,
    urgent: records.filter((r) => r.urgent).length,
    needsReply: records.filter((r) => r.needs_reply).length,
  }), [records]);

  return (
    <div style={{ padding: '24px 28px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div>
          <div className="label">CONSTITUENT CORRESPONDENCE</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', color: 'var(--text)' }}>Correspondence</h1>
        </div>
        <button className="btn" onClick={load}>Refresh</button>
      </div>

      <div className="grid-stats" style={{ marginBottom: 18 }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="label">TOTAL</div>
          <div className="mono" style={{ fontSize: 24, marginTop: 6, color: 'var(--text)' }}>{stats.total}</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="label">URGENT</div>
          <div className="mono" style={{ fontSize: 24, marginTop: 6, color: 'var(--err)' }}>{stats.urgent}</div>
        </div>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div className="label">NEEDS REPLY</div>
          <div className="mono" style={{ fontSize: 24, marginTop: 6, color: 'var(--accent)' }}>{stats.needsReply}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            className="btn btn-sm"
            style={filter === id ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
        <input
          placeholder="Search subject, sender, reason…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 7,
            background: 'var(--bg)', fontSize: 13, color: 'var(--text)', outline: 'none', minWidth: 220,
          }}
        />
      </div>

      {error && <div className="card" style={{ padding: 14, color: 'var(--err)', marginBottom: 14 }}>{error}</div>}
      {loading && <div style={{ color: 'var(--text-2)' }}>Loading…</div>}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)', gap: 14, flex: 1, minHeight: 0 }}>
          <div className="card" style={{ overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 20, color: 'var(--text-2)', fontSize: 13 }}>No correspondence matches this filter.</div>
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                  background: selected?.id === r.id ? 'var(--card-hi)' : 'transparent',
                  border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.subject}
                  </span>
                  {r.urgent && <Pill kind="err">Urgent</Pill>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{r.from}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  <Pill kind={PILL_KIND[r.priority] ?? 'info'}>{PRIORITY_LABELS[r.priority] ?? r.priority}</Pill>
                  <Pill kind="info">{CATEGORY_LABELS[r.category] ?? r.category}</Pill>
                </div>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 20, overflowY: 'auto' }}>
            {!selected && <div style={{ color: 'var(--text-2)' }}>Select a message to view details.</div>}
            {selected && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{selected.subject}</h2>
                  {selected.urgent && <Pill kind="err">Urgent</Pill>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
                  From <span className="mono">{selected.from}</span> · {fmtDateTime(selected.receivedAt)}
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <Pill kind={PILL_KIND[selected.priority] ?? 'info'}>{PRIORITY_LABELS[selected.priority] ?? selected.priority}</Pill>
                  <Pill kind="info">{CATEGORY_LABELS[selected.category] ?? selected.category}</Pill>
                  <Pill kind={selected.sentiment === 'negative' ? 'err' : selected.sentiment === 'positive' ? 'ok' : 'info'}>
                    {selected.sentiment}
                  </Pill>
                  {selected.needs_reply && <Pill kind="warn">Needs reply</Pill>}
                </div>

                {selected.topics?.length > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {selected.topics.map((t) => (
                      <span key={t} className="mono" style={{ fontSize: 11, color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="card" style={{ marginTop: 16, padding: 14, background: 'var(--bg)' }}>
                  <div className="label">CLASSIFIER REASON</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 6 }}>{selected.reason}</div>
                </div>

                <div className="label" style={{ marginTop: 18 }}>MESSAGE BODY</div>
                <div style={{ fontSize: 13.5, color: 'var(--text)', marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selected.body}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
