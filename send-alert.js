import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Calls send-alert.ps1 (bundled in this repo), which wraps PowerShell's built-in
// Send-MailMessage cmdlet against the internal Senate mail relay (imail.senate.gov,
// port 25, unauthenticated) — based on the sysadmin's existing alerting script pattern.
const SCRIPT_PATH = process.env.ALERT_SCRIPT_PATH ?? fileURLToPath(new URL('./send-alert.ps1', import.meta.url));

function sendAlertEmail({ recipients, subject, body }) {
  return new Promise((resolve, reject) => {
    if (recipients.length === 0) {
      console.warn(`No recipients configured for this category — alert not sent. Subject: "${subject}"`);
      resolve({ sent: false, reason: 'no_recipients' });
      return;
    }

    const args = [
      '-NoProfile',
      '-File', SCRIPT_PATH,
      '-To', recipients.join(';'),
      '-Subject', subject,
      '-Body', body,
    ];

    const proc = spawn('powershell.exe', args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    // Without this, a spawn failure (e.g. powershell.exe missing or unreachable)
    // emits an unhandled 'error' event and crashes the whole triage/watch process
    // instead of just failing this one alert.
    proc.on('error', (err) => {
      reject(new Error(`Failed to launch alert script: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) resolve({ sent: true });
      else reject(new Error(`Alert script exited with code ${code}: ${stderr}`));
    });
  });
}

export { sendAlertEmail };
