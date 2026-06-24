import { readdir, readFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { simpleParser } from 'mailparser';

async function parseEmlFile(filePath) {
  const raw = await readFile(filePath);
  const parsed = await simpleParser(raw);
  return {
    id: filePath,
    from: parsed.from?.text ?? 'unknown',
    subject: parsed.subject ?? '(no subject)',
    body: parsed.text ?? parsed.html ?? '',
  };
}

async function pollFolder(folderPath, onEmail) {
  const processedDir = join(folderPath, 'processed');
  await mkdir(processedDir, { recursive: true });

  const entries = await readdir(folderPath);
  const emlFiles = entries.filter((name) => name.toLowerCase().endsWith('.eml'));

  for (const name of emlFiles) {
    const filePath = join(folderPath, name);
    const email = await parseEmlFile(filePath);
    await onEmail(email);
    await rename(filePath, join(processedDir, name));
  }

  return emlFiles.length;
}

async function watchFolder(folderPath, onEmail, intervalMs = 30_000) {
  console.log(`Watching ${folderPath} for new .eml files every ${intervalMs / 1000}s. Processed files move to ${join(folderPath, 'processed')}.`);

  for (;;) {
    const count = await pollFolder(folderPath, onEmail);
    if (count > 0) console.log(`Processed ${count} new file(s).`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export { watchFolder, pollFolder, parseEmlFile };
