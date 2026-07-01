import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// ---------------------------------------------------------------------------
// Config — override with env vars
// ---------------------------------------------------------------------------
const STORE_PATH = process.env.CORRESPONDENCE_STORE_PATH
  ?? fileURLToPath(new URL('./data/correspondence.json', import.meta.url));

const FROM_DATE  = process.env.REPORT_FROM   ? new Date(process.env.REPORT_FROM)   : null;
const TO_DATE    = process.env.REPORT_TO     ? new Date(process.env.REPORT_TO + 'T23:59:59Z') : null;
const CAT_FILTER = process.env.REPORT_CAT    ? process.env.REPORT_CAT.toLowerCase() : 'all';
const URGENT_ONLY = process.env.REPORT_URGENT === '1' || process.env.REPORT_URGENT === 'true';

const CATEGORY_LABELS = {
  casework:        'Casework',
  policy_opinion:  'Policy Opinion',
  threat_or_safety:'Threat / Safety',
  administrative:  'Administrative',
  other:           'Other',
};

const PRIORITY_ORDER = { critical: 0, high: 1, normal: 2, low: 3 };

// ---------------------------------------------------------------------------
// Load + filter records
// ---------------------------------------------------------------------------
async function loadRecords() {
  let all = [];
  try {
    const raw = await readFile(STORE_PATH, 'utf-8');
    all = JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`No correspondence store found at ${STORE_PATH} — generating empty report.`);
    } else {
      throw err;
    }
  }

  return all.filter((r) => {
    const ts = new Date(r.receivedAt);
    if (FROM_DATE && ts < FROM_DATE) return false;
    if (TO_DATE   && ts > TO_DATE)   return false;
    if (CAT_FILTER !== 'all' && r.category !== CAT_FILTER) return false;
    if (URGENT_ONLY && !r.urgent) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Aggregate stats
// ---------------------------------------------------------------------------
function buildStats(records) {
  const byCategory = {};
  for (const cat of Object.keys(CATEGORY_LABELS)) {
    byCategory[cat] = { total: 0, urgent: 0, needsReply: 0, positive: 0, neutral: 0, negative: 0 };
  }

  let urgent = 0, needsReply = 0, positive = 0, neutral = 0, negative = 0;

  for (const r of records) {
    const cat = byCategory[r.category] ? r.category : 'other';
    byCategory[cat].total += 1;
    if (r.urgent)       { byCategory[cat].urgent     += 1; urgent     += 1; }
    if (r.needs_reply)  { byCategory[cat].needsReply += 1; needsReply += 1; }
    if (r.sentiment === 'positive') { byCategory[cat].positive += 1; positive += 1; }
    else if (r.sentiment === 'negative') { byCategory[cat].negative += 1; negative += 1; }
    else { byCategory[cat].neutral += 1; neutral += 1; }
  }

  return { total: records.length, urgent, needsReply, positive, neutral, negative, byCategory };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateRange() {
  const from = FROM_DATE ? FROM_DATE.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'All time';
  const to   = TO_DATE   ? TO_DATE.toLocaleDateString('en-US',   { month: 'long', day: 'numeric', year: 'numeric' }) : 'present';
  return FROM_DATE ? `${from} – ${to}` : 'All correspondence on record';
}

function sentimentBar(pos, neu, neg) {
  const total = pos + neu + neg || 1;
  const pPos = ((pos / total) * 100).toFixed(1);
  const pNeu = ((neu / total) * 100).toFixed(1);
  const pNeg = ((neg / total) * 100).toFixed(1);
  return `
    <div class="sent-bar">
      <div class="sent-pos" style="width:${pPos}%" title="Positive ${pPos}%"></div>
      <div class="sent-neu" style="width:${pNeu}%" title="Neutral ${pNeu}%"></div>
      <div class="sent-neg" style="width:${pNeg}%" title="Negative ${pNeg}%"></div>
    </div>
    <div class="sent-legend">
      <span class="dot pos"></span> Positive ${pPos}% &nbsp;
      <span class="dot neu"></span> Neutral ${pNeu}% &nbsp;
      <span class="dot neg"></span> Negative ${pNeg}%
    </div>`;
}

function buildSummary(stats, records) {
  const dateRange = fmtDateRange();
  const catBreakdown = Object.entries(stats.byCategory)
    .filter(([, v]) => v.total > 0)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([cat, v]) => `${v.total} ${CATEGORY_LABELS[cat] ?? cat}`)
    .join(', ');

  const urgentNote = stats.urgent > 0
    ? ` <strong>${stats.urgent} message${stats.urgent > 1 ? 's' : ''} required urgent staff attention.</strong>`
    : ' No messages required urgent staff attention.';

  const replyNote = stats.needsReply > 0
    ? ` ${stats.needsReply} message${stats.needsReply > 1 ? 's' : ''} ${stats.needsReply > 1 ? 'are' : 'is'} awaiting a staff response.`
    : '';

  return `This report covers constituent correspondence received during the period of ${dateRange}. ` +
    `A total of ${stats.total} message${stats.total !== 1 ? 's' : ''} were processed, comprising ${catBreakdown || 'no correspondence'}.` +
    urgentNote + replyNote;
}

// ---------------------------------------------------------------------------
// Full HTML report
// ---------------------------------------------------------------------------
function buildHTML(records, stats) {
  const urgentItems = records
    .filter((r) => r.urgent)
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9));

  const allRows = [...records].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

  const urgentRowsHTML = urgentItems.length === 0
    ? '<tr><td colspan="4" class="empty">No urgent items in this period.</td></tr>'
    : urgentItems.map((r) => `
        <tr class="urgent-row">
          <td>${fmtDate(r.receivedAt)}</td>
          <td>${esc(r.subject)}</td>
          <td>${esc(r.from)}</td>
          <td>${esc(r.reason)}</td>
        </tr>`).join('');

  const allRowsHTML = allRows.length === 0
    ? '<tr><td colspan="6" class="empty">No correspondence in this period.</td></tr>'
    : allRows.map((r) => `
        <tr class="${r.urgent ? 'urgent-row' : ''}">
          <td>${fmtDate(r.receivedAt)}</td>
          <td>${esc(r.subject)}</td>
          <td>${esc(r.from)}</td>
          <td><span class="badge cat-${esc(r.category)}">${esc(CATEGORY_LABELS[r.category] ?? r.category)}</span></td>
          <td><span class="badge pri-${esc(r.priority)}">${esc(r.priority)}</span></td>
          <td>${r.needs_reply ? '<span class="reply-flag">Reply needed</span>' : ''}</td>
        </tr>`).join('');

  const catRowsHTML = Object.entries(stats.byCategory)
    .filter(([, v]) => v.total > 0)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([cat, v]) => `
      <tr>
        <td>${esc(CATEGORY_LABELS[cat] ?? cat)}</td>
        <td class="num">${v.total}</td>
        <td class="num">${v.urgent > 0 ? `<strong>${v.urgent}</strong>` : '—'}</td>
        <td class="num">${v.needsReply > 0 ? v.needsReply : '—'}</td>
        <td class="bar-cell">${sentimentBar(v.positive, v.neutral, v.negative)}</td>
      </tr>`).join('');

  const filterNote = [
    CAT_FILTER !== 'all' ? `Category: ${CATEGORY_LABELS[CAT_FILTER] ?? CAT_FILTER}` : null,
    URGENT_ONLY ? 'Urgent only' : null,
  ].filter(Boolean).join(' · ') || 'All categories';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Constituent Correspondence Report — Senator Barrasso's Office</title>
<style>
  /* ---- Base ---- */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #fff; line-height: 1.55; }
  a { color: inherit; }

  /* ---- Layout ---- */
  .page { max-width: 960px; margin: 0 auto; padding: 48px 48px 80px; }

  /* ---- Header ---- */
  .report-header { border-bottom: 2px solid #1a1a2e; padding-bottom: 20px; margin-bottom: 32px; }
  .office-name { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #555; font-family: Arial, sans-serif; }
  .report-title { font-size: 28px; font-weight: bold; color: #1a1a2e; margin-top: 6px; }
  .report-meta { font-size: 12px; color: #555; margin-top: 8px; font-family: Arial, sans-serif; }
  .report-meta span { margin-right: 24px; }

  /* ---- Print / PDF button ---- */
  .pdf-btn { float: right; background: #1a1a2e; color: #fff; border: none; padding: 9px 18px; font-size: 12px; font-family: Arial, sans-serif; cursor: pointer; border-radius: 3px; letter-spacing: 0.5px; }
  .pdf-btn:hover { background: #2e2e5a; }

  /* ---- Section titles ---- */
  h2 { font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; color: #1a1a2e; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 36px 0 16px; font-family: Arial, sans-serif; }

  /* ---- Summary ---- */
  .summary-box { background: #f7f7f9; border-left: 4px solid #1a1a2e; padding: 16px 20px; font-size: 13.5px; line-height: 1.7; }

  /* ---- Stat cards ---- */
  .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 8px; }
  .stat-card { border: 1px solid #ddd; padding: 16px 20px; }
  .stat-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #888; font-family: Arial, sans-serif; }
  .stat-value { font-size: 36px; font-weight: bold; color: #1a1a2e; margin-top: 4px; }
  .stat-value.red { color: #b91c1c; }
  .stat-value.amber { color: #b45309; }

  /* ---- Tables ---- */
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; font-family: Arial, sans-serif; }
  th { text-align: left; padding: 8px 10px; background: #1a1a2e; color: #fff; font-size: 11px; letter-spacing: 0.5px; font-weight: normal; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr.urgent-row td { background: #fff5f5; }
  .num { text-align: right; }
  .empty { color: #999; font-style: italic; text-align: center; padding: 20px; }

  /* ---- Badges ---- */
  .badge { display: inline-block; padding: 2px 7px; border-radius: 3px; font-size: 10.5px; font-family: Arial, sans-serif; }
  .cat-casework        { background: #dbeafe; color: #1e40af; }
  .cat-policy_opinion  { background: #f3e8ff; color: #6b21a8; }
  .cat-threat_or_safety{ background: #fee2e2; color: #991b1b; font-weight: bold; }
  .cat-administrative  { background: #f0fdf4; color: #166534; }
  .cat-other           { background: #f3f4f6; color: #374151; }
  .pri-critical { background: #fee2e2; color: #991b1b; font-weight: bold; }
  .pri-high     { background: #ffedd5; color: #9a3412; }
  .pri-normal   { background: #f0fdf4; color: #166534; }
  .pri-low      { background: #f3f4f6; color: #6b7280; }
  .reply-flag   { font-size: 10.5px; color: #b45309; font-style: italic; }

  /* ---- Sentiment bar ---- */
  .sent-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: #e5e7eb; width: 100%; }
  .sent-pos { background: #15803d; }
  .sent-neu { background: #9ca3af; }
  .sent-neg { background: #b91c1c; }
  .sent-legend { font-size: 10px; color: #555; margin-top: 5px; font-family: Arial, sans-serif; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 3px; }
  .dot.pos { background: #15803d; }
  .dot.neu { background: #9ca3af; }
  .dot.neg { background: #b91c1c; }
  .bar-cell { min-width: 140px; }

  /* ---- Footer ---- */
  .report-footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; font-family: Arial, sans-serif; }

  /* ---- Print styles ---- */
  @media print {
    body { font-size: 11px; }
    .page { padding: 0; max-width: 100%; }
    .pdf-btn { display: none; }
    h2 { margin-top: 24px; }
    .stat-grid { grid-template-columns: repeat(3, 1fr); }
    tr.urgent-row td { background: #fff5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th { background: #1a1a2e !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .sent-pos, .sent-neu, .sent-neg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    a[href]:after { content: none; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <button class="pdf-btn" onclick="window.print()">Save as PDF</button>
    <div class="office-name">United States Senate</div>
    <div class="report-title">Senator Barrasso's Office</div>
    <div class="report-meta">
      <span>Constituent Correspondence Report</span>
      <span>${esc(fmtDateRange())}</span>
      <span>Filter: ${esc(filterNote)}</span>
    </div>
  </div>

  <!-- Summary -->
  <h2>Executive Summary</h2>
  <div class="summary-box">${buildSummary(stats, records)}</div>

  <!-- Stat cards -->
  <h2>At a Glance</h2>
  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-label">Total Messages</div>
      <div class="stat-value">${stats.total}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Urgent</div>
      <div class="stat-value ${stats.urgent > 0 ? 'red' : ''}">${stats.urgent}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Awaiting Reply</div>
      <div class="stat-value ${stats.needsReply > 0 ? 'amber' : ''}">${stats.needsReply}</div>
    </div>
  </div>

  <!-- Overall sentiment -->
  <h2>Overall Sentiment</h2>
  ${sentimentBar(stats.positive, stats.neutral, stats.negative)}

  <!-- By category -->
  <h2>By Category</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="num">Total</th>
        <th class="num">Urgent</th>
        <th class="num">Needs Reply</th>
        <th>Sentiment</th>
      </tr>
    </thead>
    <tbody>${catRowsHTML || '<tr><td colspan="5" class="empty">No data.</td></tr>'}</tbody>
  </table>

  <!-- Urgent items -->
  <h2>Urgent Items</h2>
  <table>
    <thead>
      <tr>
        <th style="width:100px">Date</th>
        <th>Subject</th>
        <th style="width:200px">From</th>
        <th>Classifier Reason</th>
      </tr>
    </thead>
    <tbody>${urgentRowsHTML}</tbody>
  </table>

  <!-- Full correspondence -->
  <h2>All Correspondence</h2>
  <table>
    <thead>
      <tr>
        <th style="width:90px">Date</th>
        <th>Subject</th>
        <th style="width:180px">From</th>
        <th style="width:130px">Category</th>
        <th style="width:80px">Priority</th>
        <th style="width:100px">Action</th>
      </tr>
    </thead>
    <tbody>${allRowsHTML}</tbody>
  </table>

  <!-- Footer -->
  <div class="report-footer">
    Generated ${new Date().toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · Senator Barrasso's Office Constituent Intelligence Pilot · This report contains no personally identifiable constituent information beyond what was submitted to this office.
  </div>

</div>
<script>
  // Remove PDF button focus ring after click
  document.querySelector('.pdf-btn').addEventListener('click', function() { this.blur(); });
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Loading correspondence store…');
  const records = await loadRecords();
  console.log(`  ${records.length} records match filters (${fmtDateRange()}, category=${CAT_FILTER}${URGENT_ONLY ? ', urgent-only' : ''})`);

  const stats = buildStats(records);

  const html = buildHTML(records, stats);

  const outDir = fileURLToPath(new URL('./reports', import.meta.url));
  await mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const outPath = join(outDir, `barrasso-correspondence-${stamp}.html`);
  await writeFile(outPath, html, 'utf-8');

  console.log(`\nReport saved: ${outPath}`);
  console.log('Open in Edge or Chrome → Save as PDF (Ctrl+P)');
}

main().catch((err) => {
  console.error('Report generation failed:', err.message);
  process.exit(1);
});
