import { spawn } from 'node:child_process';

// Calls the sysadmin's PowerShell mail-send script. Exact parameter names are placeholders
// until the real script and its expected arguments arrive — update SCRIPT_PATH and the
// argument list below to match once we have it.
const SCRIPT_PATH = process.env.ALERT_SCRIPT_PATH ?? 'C:\\scripts\\send-alert.ps1';

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

    proc.on('close', (code) => {
      if (code === 0) resolve({ sent: true });
      else reject(new Error(`Alert script exited with code ${code}: ${stderr}`));
    });
  });
}

export { sendAlertEmail };
