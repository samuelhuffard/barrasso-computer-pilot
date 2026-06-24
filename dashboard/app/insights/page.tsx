'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATEGORY_LABELS } from '@/components/ob-ui';

type Insights = {
  total: number;
  urgentCount: number;
  sentiment: { positive: number; neutral: number; negative: number };
  byCategory: Record<string, { total: number; positive: number; neutral: number; negative: number }>;
};

function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative;
  if (total === 0) return <div style={{ fontSize: 12, color: 'var(--ins-ink-2)' }}>No data</div>;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--ins-line)' }}>
      <div style={{ width: pct(positive), background: '#3f9b6f' }} />
      <div style={{ width: pct(neutral), background: '#b9c4d3' }} />
      <div style={{ width: pct(negative), background: 'var(--ins-red)' }} />
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="insights-page" style={{ padding: '24px 28px', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div className="label" style={{ color: 'var(--ins-ink-2)' }}>AGGREGATE INTELLIGENCE</div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', color: 'var(--ins-ink)', fontFamily: 'Georgia, serif' }}>Insights</h1>
        </div>
        <button className="btn" onClick={load}>Refresh</button>
      </div>

      {loading && <div style={{ marginTop: 20, color: 'var(--ins-ink-2)' }}>Loading…</div>}
      {error && <div className="ins-error" style={{ marginTop: 20, padding: 14, color: 'var(--ins-red)' }}>{error}</div>}

      {!loading && !error && data && (
        <>
          <div className="ins-stat-grid">
            <div className="ins-stat">
              <div className="label" style={{ color: 'var(--ins-ink-2)' }}>TOTAL MESSAGES</div>
              <div className="ins-stat-value">{data.total}</div>
              <div className="ins-stat-detail">All processed correspondence</div>
            </div>
            <div className="ins-stat">
              <div className="label" style={{ color: 'var(--ins-ink-2)' }}>URGENT</div>
              <div className="ins-stat-value danger">{data.urgentCount}</div>
              <div className="ins-stat-detail">Flagged for immediate review</div>
            </div>
            <div className="ins-stat">
              <div className="label" style={{ color: 'var(--ins-ink-2)' }}>POSITIVE SENTIMENT</div>
              <div className="ins-stat-value">{data.sentiment.positive}</div>
              <div className="ins-stat-detail">of {data.total} total</div>
            </div>
            <div className="ins-stat">
              <div className="label" style={{ color: 'var(--ins-ink-2)' }}>NEGATIVE SENTIMENT</div>
              <div className="ins-stat-value danger">{data.sentiment.negative}</div>
              <div className="ins-stat-detail">of {data.total} total</div>
            </div>
          </div>

          <div className="ins-panel" style={{ marginTop: 20, padding: 18 }}>
            <div className="label" style={{ color: 'var(--ins-ink-2)', marginBottom: 12 }}>OVERALL SENTIMENT</div>
            <SentimentBar {...data.sentiment} />
          </div>

          <div className="ins-panel" style={{ marginTop: 16, padding: 18 }}>
            <div className="label" style={{ color: 'var(--ins-ink-2)', marginBottom: 14 }}>BY CATEGORY</div>
            {Object.keys(data.byCategory).length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--ins-ink-2)' }}>No correspondence yet.</div>
            )}
            {Object.entries(data.byCategory).map(([cat, stats]) => (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ins-ink)', marginBottom: 6 }}>
                  <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <span className="mono">{stats.total}</span>
                </div>
                <SentimentBar positive={stats.positive} neutral={stats.neutral} negative={stats.negative} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
