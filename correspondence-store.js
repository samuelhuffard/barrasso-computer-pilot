import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STORE_PATH = process.env.CORRESPONDENCE_STORE_PATH
  ?? fileURLToPath(new URL('./data/correspondence.json', import.meta.url));

async function readAllRecords() {
  try {
    const raw = await readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function appendRecord(record) {
  const records = await readAllRecords();
  records.push(record);
  await mkdir(dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(records, null, 2)}\n`);
  return record;
}

function buildRecord(email, classification) {
  return {
    id: email.id,
    receivedAt: new Date().toISOString(),
    from: email.from ?? 'unknown',
    subject: email.subject,
    body: email.body,
    ...(email.constituent ? { constituent: email.constituent } : {}),
    ...(email.issue ? { issue: email.issue } : {}),
    ...classification,
  };
}

export { readAllRecords, appendRecord, buildRecord, STORE_PATH };
