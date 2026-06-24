import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { NextResponse } from 'next/server';

const STORE_PATH = process.env.CORRESPONDENCE_STORE_PATH
  ?? fileURLToPath(new URL('../../../../data/correspondence.json', import.meta.url));

export async function GET() {
  try {
    const raw = await readFile(STORE_PATH, 'utf-8');
    const records = JSON.parse(raw);
    return NextResponse.json({ records: records.reverse() });
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
      return NextResponse.json({ records: [] });
    }
    return NextResponse.json({ error: 'Failed to read correspondence store' }, { status: 500 });
  }
}
