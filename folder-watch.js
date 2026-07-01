import { readdir, readFile, mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { simpleParser } from 'mailparser';
import { parseSccmailBlock } from './sccmail-parser.js';

async function parseEmlFile(filePath) {
  const raw = await readFile(filePath);
  const parsed = await simpleParser(raw);
  const rawBody = parsed.text ?? parsed.html ?? '';

  const email = {
    id: filePath,
    from: parsed.from?.text ?? 'unknown',
    subject: parsed.subject ?? '(no subject)',
    body: rawBody,
    rawBody,
  };

  // Casework intake emails wrap the constituent's actual message in a
  // SCCMAIL <APP> block alongside contact fields and forward-header noise.
  // Use the clean message text for classification and surface contact
  // fields separately so they aren't lost or fed to the model as prose.
  const sccmail = parseSccmailBlock(rawBody);
  if (sccmail) {
    email.body = sccmail.message || rawBody;
    email.constituent = sccmail.constituent;
    email.issue = sccmail.issue;
    email.responseRequested = sccmail.responseRequested;
  }

  return email;
}

async function pollFolder(folderPath, onEmail) {
  const readDir = join(folderPath, 'read');
  const failedDir = join(folderPath, 'failed');
  await mkdir(readDir, { recursive: true });
  await mkdir(failedDir, { recursive: true });

  const entries = await readdir(folderPath);
  const emlFiles = entries.filter((name) => name.toLowerCase().endsWith('.eml'));

  for (const name of emlFiles) {
    const filePath = join(folderPath, name);
    try {
      const email = await parseEmlFile(filePath);
      await onEmail(email);
      await rename(filePath, join(readDir, name));
    } catch (err) {
      console.error(`Failed to process ${name}, moving to ${failedDir}: ${err.message}`);
      await rename(filePath, join(failedDir, name));
    }
  }

  return emlFiles.length;
}

async function watchFolder(folderPath, onEmail, intervalMs = 120_000) {
  console.log(`Watching ${folderPath} for new .eml files every ${intervalMs / 1000}s. Triaged files move to ${join(folderPath, 'read')}.`);

  for (;;) {
    const count = await pollFolder(folderPath, onEmail);
    if (count > 0) console.log(`Processed ${count} new file(s).`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export { watchFolder, pollFolder, parseEmlFile };
