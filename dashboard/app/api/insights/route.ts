import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NextResponse } from 'next/server';

const STORE_PATH = process.env.CORRESPONDENCE_STORE_PATH
  ?? fileURLToPath(new URL('../../../../data/correspondence.json', import.meta.url));

type Record_ = {
  category: string;
  sentiment: string;
  urgent: boolean;
  priority: string;
};

export async function GET() {
  let records: Record_[] = [];
  try {
    const raw = await readFile(STORE_PATH, 'utf-8');
    records = JSON.parse(raw);
  } catch (err: unknown) {
    if (!(err instanceof Error && 'code' in err && err.code === 'ENOENT')) {
      return NextResponse.json({ error: 'Failed to read correspondence store' }, { status: 500 });
    }
  }

  const byCategory: Record<string, { total: number; positive: number; neutral: number; negative: number }> = {};
  let urgentCount = 0;
  let positive = 0;
  let neutral = 0;
  let negative = 0;

  for (const r of records) {
    const cat = r.category ?? 'other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, positive: 0, neutral: 0, negative: 0 };
    byCategory[cat].total += 1;
    if (r.sentiment === 'positive') { byCategory[cat].positive += 1; positive += 1; }
    else if (r.sentiment === 'negative') { byCategory[cat].negative += 1; negative += 1; }
    else { byCategory[cat].neutral += 1; neutral += 1; }
    if (r.urgent) urgentCount += 1;
  }

  return NextResponse.json({
    total: records.length,
    urgentCount,
    sentiment: { positive, neutral, negative },
    byCategory,
  });
}
