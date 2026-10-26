import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import type { WeeklyPlan, WeeklyPlanItem, WeekProgress } from '@/core/repositories/weeklyPlanRepository';

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const MOOD_EMOJI: Record<number, string> = { 1: '😞', 2: '😐', 3: '🙂', 4: '😄', 5: '🤩' };
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "Lunes 20 de octubre" */
function longDateEs(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return `${DAY_NAMES[dt.getDay()]} ${d} de ${MONTHS[m - 1]}`;
}

/** Racha de escritura que termina en `date` (días consecutivos con entrada) */
async function writingStreakAsOf(date: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    'SELECT entry_date FROM diary_entries WHERE entry_date <= ? ORDER BY entry_date DESC', [date],
  );
  if (rows.length === 0) return 0;
  let streak = 0;
  let cursor = new Date(date);
  for (const r of rows) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (r.entry_date === iso) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (r.entry_date < iso) {
      break;
    }
  }
  return streak;
}

/** Diseño compartido Warm Clay Editorial v2 para todos los PDFs */
const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; padding: 42px 40px; color: #2B2B2B; background: #FAF6F0; }
  .brand-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
  .monogram { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg, #3E6B60, #6FA08F); color: #fff; font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; letter-spacing: 1px; }
  .brand-name { font-size: 13px; font-weight: 700; color: #3E6B60; letter-spacing: 3px; text-transform: uppercase; font-family: 'Segoe UI', sans-serif; }
  .kicker { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #6E6A65; font-weight: 700; font-family: 'Segoe UI', sans-serif; }
  h1 { font-size: 27px; font-weight: 700; margin-top: 4px; color: #2B2B2B; }
  .subtitle { font-size: 13px; color: #6E6A65; margin-top: 4px; font-family: 'Segoe UI', sans-serif; }
  h2 { font-size: 14px; color: #3E6B60; border-left: 4px solid #DCE9E4; padding-left: 10px; margin: 22px 0 10px; font-weight: 700; font-family: 'Segoe UI', sans-serif; text-transform: uppercase; letter-spacing: 1px; }
  h2.gym { color: #8F4E33; border-left-color: #F3E1D8; }
  .muted { color: #6E6A65; font-size: 12px; font-family: 'Segoe UI', sans-serif; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-family: 'Segoe UI', sans-serif; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6E6A65; padding: 6px; border-bottom: 2px solid #E8E0D6; background: #F4EEE6; }
  td { padding: 7px 6px; border-bottom: 1px solid #F0EBE3; font-size: 12.5px; }
  .tag { display: inline-block; background: #DCE9E4; color: #3E6B60; padding: 2px 10px; border-radius: 99px; font-size: 11px; margin: 2px; font-weight: 600; font-family: 'Segoe UI', sans-serif; }
  .tag-gym { background: #F3E1D8; color: #8F4E33; }
  .badge { background: #FCEFD9; color: #8A5B14; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; font-family: 'Segoe UI', sans-serif; }
  .stat-row { display: flex; gap: 12px; margin: 12px 0; }
  .stat { text-align: center; flex: 1; background: #fff; border-radius: 14px; padding: 14px 8px; border: 1px solid #E8E0D6; }
  .stat .n { font-family: 'Courier New', monospace; font-size: 24px; font-weight: 700; }
  .stat .l { font-size: 8.5px; text-transform: uppercase; letter-spacing: 1.5px; color: #6E6A65; margin-top: 3px; font-family: 'Segoe UI', sans-serif; }
  .mood-hero { display: flex; align-items: center; gap: 18px; background: #fff; border: 1px solid #E8E0D6; border-radius: 16px; padding: 16px 20px; margin: 12px 0; }
  .mood-emoji { font-size: 46px; }
  .note-block { background: #fff; border: 1px solid #E8E0D6; border-left: 4px solid #E0A458; border-radius: 10px; padding: 14px 16px; font-size: 13px; line-height: 1.65; margin: 8px 0; white-space: pre-wrap; }
  .gratitude-item { display: flex; gap: 8px; margin: 5px 0; font-size: 13px; align-items: flex-start; }
  .habit-check { display: inline-block; margin: 3px 6px 3px 0; font-size: 12px; font-family: 'Segoe UI', sans-serif; }
  .plan-day { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; margin-bottom: 6px; background: #fff; border: 1px solid #E8E0D6; font-family: 'Segoe UI', sans-serif; }
  .plan-day.done { background: #F1F7F4; border-color: #BCD8CD; }
  .day-letter { font-weight: 800; font-size: 12px; color: #6E6A65; width: 34px; }
  .day-date { font-size: 11px; color: #A8A29A; width: 48px; font-family: 'Courier New', monospace; }
  .day-routines { flex: 1; font-size: 13px; font-weight: 600; }
  .day-status { font-size: 15px; }
  .progress-bar { height: 12px; border-radius: 99px; background: #E8E0D6; overflow: hidden; margin: 10px 0 6px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #3E6B60, #6FA08F); }
  .pr-line { color: #8A5B14; font-weight: 700; }
  .footer { margin-top: 32px; padding-top: 14px; border-top: 1px solid #E8E0D6; font-size: 10px; color: #A8A29A; text-align: center; font-family: 'Segoe UI', sans-serif; }
  .brand { font-weight: 700; color: #3E6B60; }
`;

function headerHtml(kicker: string, title: string, subtitle?: string): string {
  return `
    <div class="brand-row"><div class="monogram">DF</div><div class="brand-name">DiarioFit</div></div>
    <div class="kicker">${kicker}</div>
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}`;
}

function footerHtml(): string {
  return `<div class="footer"><span class="brand">DiarioFit</span> · Tu vida, tu gimnasio, tu bitácora · Exportado el ${new Date().toLocaleDateString('es')}</div>`;
}

/** "24850" → "24.8k" (compacto para tarjetas de redes) */
function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1).replace('.0', '')}k`;
  return String(Math.round(n));
}

type SocialParts = { ringHtml: string; barsHtml?: string; zonesHtml?: string; dateStr: string };

type SocialData = {
  title: string;
  titleAccent?: string;
  subtitle: string;
  stats: Array<{ value: string; label: string; color: string; icon?: string }>;
  best?: string;
  footer?: string;
};

/** Tarjeta de redes — estilo SÚPER ELÉCTRICO (oscuro + neón + glow + barras) */
function electricBody(data: SocialData, parts: SocialParts): string {
  const stats = data.stats.map(s =>
    `<div class="glass stat"><span class="l">${esc(s.label)}</span><span class="v" style="color:${s.color}; text-shadow:0 0 18px ${s.color}aa">${esc(s.value)}</span></div>`
  ).join('');
  const title = data.titleAccent
    ? `${esc(data.title)}<br><span style="color:#FF2E93; text-shadow:0 0 18px rgba(255,46,147,.75),0 0 42px rgba(255,46,147,.35)">${esc(data.titleAccent)}</span>`
    : `<span style="color:#00F0FF; text-shadow:0 0 18px rgba(0,240,255,.75),0 0 42px rgba(0,240,255,.35)">${esc(data.title)}</span>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1080px; overflow:hidden; position:relative; color:#fff;
      font-family:'Space Grotesk',sans-serif;
      background: radial-gradient(1200px 800px at 85% -10%, #1b1040 0%, transparent 55%),
                  radial-gradient(1000px 700px at -10% 110%, #062a33 0%, transparent 55%),
                  linear-gradient(160deg, #0a0c14 0%, #0d1020 50%, #0a0c14 100%); }
    .bolt { position:absolute; font-size:260px; opacity:.10; filter:blur(2px); }
    .pad { position:absolute; inset:0; padding:60px 72px; display:flex; flex-direction:column; }
    .top { display:flex; align-items:center; justify-content:space-between; }
    .brand { display:flex; align-items:center; gap:16px; }
    .mark { width:58px; height:58px; border-radius:16px; display:flex; align-items:center; justify-content:center;
      font-family:'JetBrains Mono',monospace; font-weight:800; font-size:24px; color:#04121a;
      background:linear-gradient(135deg,#00F0FF,#B8FF3C); box-shadow:0 0 30px rgba(0,240,255,.55); }
    .brand-name { font-size:26px; font-weight:700; letter-spacing:6px; text-transform:uppercase; color:#e9fbff; }
    .handle { font-size:20px; color:#7d8aa3; letter-spacing:1px; }
    .hero { margin-top:34px; }
    .kicker { font-size:20px; letter-spacing:7px; text-transform:uppercase; color:#00F0FF; font-weight:700; }
    .title { font-family:'JetBrains Mono',monospace; font-weight:800; font-size:84px; line-height:.95; margin-top:12px; letter-spacing:-2px; }
    .sub { font-size:26px; color:#93a1ba; margin-top:14px; font-weight:500; }
    .midrow { display:flex; gap:26px; margin-top:26px; align-items:stretch; }
    .glass { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.10); border-radius:28px;
      backdrop-filter:blur(6px); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 20px 50px rgba(0,0,0,.4); }
    .ring-card { width:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px; }
    .ring-wrap { position:relative; width:186px; height:186px; }
    .ring-wrap svg { display:block; width:100%; height:100%; }
    .ring-num { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); margin:0;
      font-family:'JetBrains Mono',monospace; font-weight:800; font-size:46px; color:#00F0FF; text-shadow:0 0 18px rgba(0,240,255,.75); }
    .ring-lbl { font-size:17px; color:#93a1ba; letter-spacing:3px; text-transform:uppercase; margin-top:14px; text-align:center; }
    .stats-col { flex:1; display:flex; flex-direction:column; gap:20px; }
    .stat { flex:1; display:flex; align-items:center; justify-content:space-between; padding:0 34px; }
    .stat .l { font-size:20px; color:#93a1ba; letter-spacing:2px; text-transform:uppercase; font-weight:600; }
    .stat .v { font-family:'JetBrains Mono',monospace; font-weight:800; font-size:48px; }
    .chart-card { margin-top:22px; padding:22px 32px 18px; }
    .chart-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .chart-title { font-size:20px; letter-spacing:3px; text-transform:uppercase; color:#c9d6ec; font-weight:700; }
    .chart-peak { font-size:17px; color:#B8FF3C; font-weight:600; }
    .bars { display:flex; align-items:flex-end; gap:16px; height:132px; }
    .bcol { flex:1; display:flex; flex-direction:column; align-items:center; gap:12px; height:100%; justify-content:flex-end; }
    .bbar { width:100%; border-radius:12px 12px 4px 4px; background:linear-gradient(180deg,#00F0FF,#0090ff); box-shadow:0 0 22px rgba(0,240,255,.45); }
    .bbar.hi { background:linear-gradient(180deg,#B8FF3C,#00F0FF); box-shadow:0 0 30px rgba(184,255,60,.6); }
    .blab { font-size:18px; color:#7d8aa3; font-weight:700; letter-spacing:1px; }
    .bottom { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:20px; }
    .chip { display:flex; align-items:center; gap:14px; padding:14px 24px; border-radius:20px; flex-shrink:1; min-width:0; }
    .chip .ic { font-size:30px; }
    .chip .ct { font-size:16px; color:#93a1ba; text-transform:uppercase; letter-spacing:2px; }
    .chip .cv { font-family:'JetBrains Mono',monospace; font-weight:800; font-size:26px; color:#B8FF3C; text-shadow:0 0 14px rgba(184,255,60,.6); }
    .date { font-size:20px; color:#5f6b82; letter-spacing:1px; white-space:nowrap; }
  </style></head><body>
    <div class="bolt" style="top:-40px; right:-30px;">⚡</div>
    <div class="bolt" style="bottom:-70px; left:-40px; transform:rotate(15deg);">⚡</div>
    <div class="pad">
      <div class="top">
        <div class="brand"><div class="mark">DF</div><div class="brand-name">DiarioFit</div></div>
        <div class="handle">${esc(data.footer ?? '@DiarioFit')}</div>
      </div>
      <div class="hero">
        <div class="kicker">Resumen de la semana</div>
        <div class="title">${title}</div>
        <div class="sub">${esc(data.subtitle)}</div>
      </div>
      <div class="midrow">
        ${parts.ringHtml ? `<div class="glass ring-card">${parts.ringHtml}</div>` : ''}
        <div class="stats-col">${stats}</div>
      </div>
      ${parts.barsHtml}
      <div class="bottom">
        ${data.best ? `<div class="glass chip"><span class="ic">🏆</span><div><div class="ct">Mejor marca</div><div class="cv">${esc(data.best)}</div></div></div>` : '<div></div>'}
        <div class="date">${esc(parts.dateStr)}</div>
      </div>
    </div>
  </body></html>`;
}

/** Tarjeta de redes — estilo IDENTIDAD VISUAL (Warm Clay Editorial) */
function clayBody(data: SocialData, parts: SocialParts): string {
  const stats = data.stats.map(s =>
    `<div class="card"><div class="ic">${s.icon ?? '•'}</div><div class="v" style="color:${s.color}">${esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`
  ).join('');
  const title = data.titleAccent
    ? `${esc(data.title)}<br><span class="accent">${esc(data.titleAccent)}</span>`
    : esc(data.title);

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Nunito+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:1080px; height:1080px; overflow:hidden; position:relative; background:#FAF6F0; color:#2B2B2B;
      font-family:'Nunito Sans',sans-serif; }
    .blob { position:absolute; border-radius:50%; filter:blur(70px); opacity:.42; }
    .b1 { width:520px; height:520px; background:#7FA898; top:-190px; right:-140px; }
    .b2 { width:460px; height:460px; background:#E7B58C; bottom:-180px; left:-150px; }
    .b3 { width:300px; height:300px; background:#E0A458; top:44%; left:52%; opacity:.25; }
    .pad { position:absolute; inset:0; padding:60px 70px 56px; display:flex; flex-direction:column; z-index:2; }
    .top { display:flex; align-items:center; justify-content:space-between; }
    .brand { display:flex; align-items:center; gap:16px; }
    .mark { width:60px; height:60px; border-radius:18px; display:flex; align-items:center; justify-content:center;
      font-family:'JetBrains Mono',monospace; font-weight:800; font-size:26px; color:#fff;
      background:linear-gradient(135deg,#3E6B60,#6FA08F); box-shadow:0 10px 26px rgba(62,107,96,.35); }
    .brand-name { font-family:'Fraunces',serif; font-weight:700; font-size:30px; color:#3E6B60; letter-spacing:1px; }
    .handle { font-size:21px; color:#8C857C; font-weight:600; }
    .hero { margin-top:34px; }
    .kicker { font-size:19px; letter-spacing:6px; text-transform:uppercase; color:#A8A29A; font-weight:800; }
    .title { font-family:'Fraunces',serif; font-weight:700; font-size:84px; line-height:1.0; margin-top:12px; color:#2B2B2B; }
    .title .accent, .accent { color:#C67B5C; font-style:italic; }
    .sub { font-size:26px; color:#6E6A65; margin-top:14px; font-weight:600; }
    .stats { display:flex; gap:20px; margin-top:30px; }
    .card { flex:1; background:#fff; border:1px solid #E8E0D6; border-radius:26px; padding:22px; text-align:center;
      box-shadow:0 14px 34px rgba(120,100,80,.10); }
    .card .ic { font-size:30px; }
    .card .v { font-family:'JetBrains Mono',monospace; font-weight:800; font-size:52px; margin-top:8px; line-height:1; }
    .card .l { font-size:15px; color:#8C857C; text-transform:uppercase; letter-spacing:2px; margin-top:8px; font-weight:700; }
    .mid { display:flex; gap:20px; margin-top:18px; align-items:stretch; }
    .ring-card { width:320px; background:#fff; border:1px solid #E8E0D6; border-radius:26px; padding:24px;
      display:flex; flex-direction:column; align-items:center; box-shadow:0 14px 34px rgba(120,100,80,.10); }
    .ring-wrap { position:relative; width:180px; height:180px; }
    .ring-wrap svg { display:block; width:100%; height:100%; }
    .ring-num { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); margin:0;
      font-family:'JetBrains Mono',monospace; font-weight:800; font-size:46px; color:#3E6B60; }
    .ring-lbl { font-size:15px; color:#8C857C; letter-spacing:2px; text-transform:uppercase; margin-top:12px; font-weight:700; text-align:center; }
    .zones-card { flex:1; background:#fff; border:1px solid #E8E0D6; border-radius:26px; padding:24px 28px; box-shadow:0 14px 34px rgba(120,100,80,.10); }
    .zones-title { font-size:16px; letter-spacing:2px; text-transform:uppercase; color:#8C857C; font-weight:800; margin-bottom:16px; }
    .zrow { display:flex; align-items:center; gap:14px; margin:10px 0; }
    .zname { width:120px; font-size:19px; font-weight:700; color:#2B2B2B; }
    .ztrack { flex:1; height:20px; background:#F1EBE2; border-radius:99px; overflow:hidden; }
    .zfill { height:100%; border-radius:99px; background:linear-gradient(90deg,#C67B5C,#E0A458); }
    .zval { width:92px; text-align:right; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:18px; color:#8C857C; }
    .bottom { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:24px; }
    .best { background:#fff; border:1px solid #E8E0D6; border-left:6px solid #E0A458; border-radius:18px; padding:16px 26px; box-shadow:0 10px 26px rgba(120,100,80,.10); flex-shrink:1; min-width:0; }
    .best .l { font-size:14px; text-transform:uppercase; letter-spacing:2px; color:#8C857C; font-weight:800; }
    .best .v { font-family:'Fraunces',serif; font-weight:700; font-size:28px; color:#2B2B2B; margin-top:4px; }
    .date { font-size:20px; color:#A8A29A; font-weight:600; white-space:nowrap; }
    .mini-bars { display:flex; align-items:flex-end; gap:14px; height:150px; margin-top:16px; }
    .mcol { flex:1; display:flex; flex-direction:column; align-items:center; gap:10px; height:100%; justify-content:flex-end; }
    .mbar { width:100%; border-radius:10px 10px 3px 3px; background:linear-gradient(180deg,#C67B5C,#E0A458); }
    .mbar.hi { background:linear-gradient(180deg,#3E6B60,#6FA08F); }
    .mlab { font-size:16px; color:#8C857C; font-weight:800; }
  </style></head><body>
    <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
    <div class="pad">
      <div class="top">
        <div class="brand"><div class="mark">DF</div><div class="brand-name">DiarioFit</div></div>
        <div class="handle">${esc(data.footer ?? '@DiarioFit')}</div>
      </div>
      <div class="hero">
        <div class="kicker">Mi semana</div>
        <div class="title">${title}</div>
        <div class="sub">${esc(data.subtitle)}</div>
      </div>
      <div class="stats">${stats}</div>
      <div class="mid">
        ${parts.ringHtml ? `<div class="ring-card">${parts.ringHtml}</div>` : ''}
        ${parts.zonesHtml ?? ''}
      </div>
      <div class="bottom">
        ${data.best ? `<div class="best"><div class="l">🥇 Mejor marca</div><div class="v">${esc(data.best)}</div></div>` : '<div></div>'}
        <div class="date">${esc(parts.dateStr)}</div>
      </div>
    </div>
  </body></html>`;
}

export const pdfService = {
  /** Exporta una sesión de gym completa a PDF (v2: rutina, evolución, RPE medio, PRs) */
  async exportSession(sessionId: number): Promise<string> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<{ id: number; session_date: string; duration_min: number | null; notes: string | null; routine_id: number | null; started_at: string | null; finished_at: string | null }>(
      'SELECT * FROM workout_sessions WHERE id = ?', [sessionId],
    );
    if (!session) throw new AppError('NOT_FOUND', 'Sesión inexistente');

    const routine = session.routine_id
      ? await db.getFirstAsync<{ name: string }>('SELECT name FROM routines WHERE id = ?', [session.routine_id])
      : null;

    const exercises = await db.getAllAsync<{ id: number; exercise_id: number; name: string }>(
      `SELECT se.id, se.exercise_id, e.name FROM session_exercises se
       JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`,
      [sessionId],
    );

    let exercisesHtml = '';
    let totalSets = 0;
    let totalVolume = 0;
    let prCount = 0;
    let rpeSum = 0;
    let rpeN = 0;

    for (const ex of exercises) {
      const sets = await db.getAllAsync<{ set_number: number; weight: number | null; reps: number | null; rpe: number | null; is_pr: number; is_completed: number }>(
        'SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_number', [ex.id],
      );
      const done = sets.filter(s => s.is_completed);
      totalSets += done.length;
      totalVolume += done.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
      prCount += done.filter(s => s.is_pr).length;
      for (const s of done) if (s.rpe != null) { rpeSum += s.rpe; rpeN += 1; }

      // Mejor marca previa (antes de esta sesión) para mostrar evolución
      const prev = await db.getFirstAsync<{ weight: number; reps: number }>(
        `SELECT ss.weight, ss.reps FROM session_sets ss
         JOIN session_exercises se ON se.id = ss.session_exercise_id
         JOIN workout_sessions ws ON ws.id = se.session_id
         WHERE se.exercise_id = ? AND ss.is_completed = 1 AND ws.session_date < ?
         ORDER BY (ss.weight * ss.reps) DESC LIMIT 1`,
        [ex.exercise_id, session.session_date],
      );
      const bestThis = done.reduce((a, s) => ((s.weight ?? 0) * (s.reps ?? 0) > (a.weight ?? 0) * (a.reps ?? 0) ? s : a), { weight: 0, reps: 0 } as { weight: number | null; reps: number | null });
      let evolution = '';
      if (prev && bestThis.weight && bestThis.reps) {
        const prevVol = prev.weight * prev.reps;
        const nowVol = (bestThis.weight ?? 0) * (bestThis.reps ?? 0);
        if (nowVol > prevVol) evolution = `<span class="pr-line">📈 +${Math.round(((nowVol - prevVol) / prevVol) * 100)}% vs tu marca previa</span>`;
        else if (nowVol === prevVol) evolution = `<span class="muted">= igual que tu marca previa</span>`;
        else evolution = `<span class="muted">↓ por debajo de tu marca previa</span>`;
      }

      const rows = done.map(s => `<tr><td>${s.set_number}</td><td>${s.weight != null ? s.weight + ' kg' : '—'}</td><td>${s.reps ?? '—'}</td><td>${s.rpe ?? '—'}</td><td>${s.is_pr ? '🏆 PR' : '✓'}</td></tr>`).join('');
      exercisesHtml += `<h2 class="gym">${esc(ex.name)}</h2>${evolution ? `<p style="margin:2px 0 6px">${evolution}</p>` : ''}<table><tr><th>#</th><th>Peso</th><th>Reps</th><th>RPE</th><th>Marca</th></tr>${rows}</table>`;
    }

    const rpeAvg = rpeN > 0 ? (rpeSum / rpeN).toFixed(1) : '—';
    const durationTxt = session.started_at && session.finished_at
      ? `${Math.max(1, Math.round((new Date(session.finished_at).getTime() - new Date(session.started_at).getTime()) / 60000))} min`
      : `${session.duration_min ?? '?'} min`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      ${headerHtml('SESIÓN DE ENTRENAMIENTO', longDateEs(session.session_date), `${routine ? esc(routine.name) + ' · ' : ''}${durationTxt} · ${exercises.length} ejercicios · ${totalSets} series`)}
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#C67B5C">${exercises.length}</div><div class="l">Ejercicios</div></div>
        <div class="stat"><div class="n" style="color:#3E6B60">${totalSets}</div><div class="l">Series</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${totalVolume.toLocaleString()}</div><div class="l">Volumen kg</div></div>
        <div class="stat"><div class="n" style="color:#7A6FB0">${rpeAvg}</div><div class="l">RPE medio</div></div>
        <div class="stat"><div class="n" style="color:#8A5B14">${prCount}</div><div class="l">PRs 🏆</div></div>
      </div>
      ${exercisesHtml}
      ${session.notes ? `<h2>Notas de la sesión</h2><div class="note-block">${esc(session.notes)}</div>` : ''}
      ${footerHtml()}
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Exporta un día completo (diario + gym) a PDF — v2 con clima, peso, calidad sueño, hábitos, detalle gym y racha */
  async exportDay(date: string): Promise<string> {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<{ mood: number | null; energy: number | null; sleep_hours: number | null; sleep_quality: number | null; body_weight: number | null; weather_icon: string | null; notes: string | null; is_closed: number | null }>(
      'SELECT * FROM diary_entries WHERE entry_date = ?', [date],
    );
    const gratitudes = await db.getAllAsync<{ text: string }>(
      'SELECT g.text FROM gratitude_items g JOIN diary_entries de ON de.id = g.entry_id WHERE de.entry_date = ?', [date],
    );
    const habits = await db.getAllAsync<{ name: string; icon: string | null }>(
      `SELECT h.name, h.icon FROM habit_logs hl JOIN habits h ON h.id = hl.habit_id WHERE hl.log_date = ? AND hl.done = 1`, [date],
    );
    const session = await db.getFirstAsync<{ id: number; duration_min: number | null; routine_id: number | null }>(
      'SELECT id, duration_min, routine_id FROM workout_sessions WHERE session_date = ? AND finished_at IS NOT NULL', [date],
    );
    const streak = await writingStreakAsOf(date);

    let sessionHtml = '';
    if (session) {
      const routine = session.routine_id ? await db.getFirstAsync<{ name: string }>('SELECT name FROM routines WHERE id = ?', [session.routine_id]) : null;
      const exercises = await db.getAllAsync<{ id: number; name: string }>(
        `SELECT se.id, e.name FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`, [session.id],
      );
      let rowsHtml = '';
      let dayVolume = 0;
      let daySets = 0;
      let dayPrs = 0;
      for (const ex of exercises) {
        const sets = await db.getAllAsync<{ weight: number | null; reps: number | null; is_pr: number }>(
          'SELECT weight, reps, is_pr FROM session_sets WHERE session_exercise_id = ? AND is_completed = 1', [ex.id],
        );
        const vol = sets.reduce((a, s) => a + (s.weight ?? 0) * (s.reps ?? 0), 0);
        const prs = sets.filter(s => s.is_pr).length;
        dayVolume += vol; daySets += sets.length; dayPrs += prs;
        const top = sets.reduce((a, s) => ((s.weight ?? 0) * (s.reps ?? 0) > (a.weight ?? 0) * (a.reps ?? 0) ? s : a), { weight: 0, reps: 0 } as { weight: number | null; reps: number | null });
        rowsHtml += `<tr><td>${esc(ex.name)}</td><td>${sets.length}</td><td>${top.weight && top.reps ? `${top.weight} kg × ${top.reps}` : '—'}</td><td>${vol.toLocaleString()}</td><td>${prs > 0 ? '🏆 ' + prs : '—'}</td></tr>`;
      }
      sessionHtml = `<h2 class="gym">🏋️ Entrenamiento${routine ? ` — ${esc(routine.name)}` : ''}</h2>
        <p class="muted">${session.duration_min ?? '?'} min · ${exercises.length} ejercicios · ${daySets} series · ${dayVolume.toLocaleString()} kg de volumen${dayPrs > 0 ? ` · ${dayPrs} PR 🏆` : ''}</p>
        <table><tr><th>Ejercicio</th><th>Series</th><th>Mejor serie</th><th>Volumen</th><th>PRs</th></tr>${rowsHtml}</table>`;
    }

    const wordCount = entry?.notes ? entry.notes.trim().split(/\s+/).length : 0;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      ${headerHtml('MI DÍA', longDateEs(date), `${entry?.is_closed ? '🔒 Día cerrado · ' : ''}${streak > 0 ? `🔥 Racha de escritura: ${streak} días` : 'Sin racha activa'}`)}
      ${entry ? `
        <div class="mood-hero">
          <div class="mood-emoji">${entry.mood ? MOOD_EMOJI[entry.mood] ?? '🙂' : '—'}</div>
          <div style="flex:1">
            <div style="font-size:20px;font-weight:700">${entry.mood ? `Ánimo ${entry.mood}/5` : 'Sin ánimo registrado'}</div>
            <div class="muted" style="margin-top:4px">
              ⚡ Energía ${entry.energy ? `${entry.energy}/5` : '—'} ·
              😴 Sueño ${entry.sleep_hours != null ? `${entry.sleep_hours}h` : '—'}${entry.sleep_quality != null ? ` (calidad ${entry.sleep_quality}/5)` : ''} ·
              ⚖️ ${entry.body_weight != null ? `${entry.body_weight} kg` : '—'}
              ${entry.weather_icon ? ` · ${esc(entry.weather_icon)}` : ''}
            </div>
          </div>
        </div>` : '<p class="muted">Sin entrada de diario para este día.</p>'}
      ${entry?.notes ? `<h2>📓 Mi reflexión${wordCount > 0 ? ` <span class="muted">(${wordCount} palabras)</span>` : ''}</h2><div class="note-block">${esc(entry.notes)}</div>` : ''}
      ${gratitudes.length > 0 ? `<h2>🙏 Gratitud</h2>${gratitudes.map(g => `<div class="gratitude-item"><span>✦</span><span>${esc(g.text)}</span></div>`).join('')}` : ''}
      ${habits.length > 0 ? `<h2>✅ Hábitos cumplidos</h2><div>${habits.map(h => `<span class="habit-check">${esc(h.icon ?? '✅')} ${esc(h.name)}</span>`).join('')}</div>` : ''}
      ${sessionHtml}
      ${footerHtml()}
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /**
   * Exporta el resumen semanal a PDF — v2: calcula volumen, mejor marca,
   * zonas, días de gym y comparación con la semana anterior.
   */
  async exportWeeklySummary(from: string, to: string, summary: { gymSessions: number; diaryEntries: number; habitsDone: number; avgSleep: number | null; avgMood: number | null; totalSets: number; }): Promise<string> {
    const db = await getDatabase();

    const volRow = await db.getFirstAsync<{ volume: number }>(
      `SELECT COALESCE(SUM(ss.weight * ss.reps), 0) AS volume FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       WHERE ss.is_completed = 1 AND ws.finished_at IS NOT NULL AND ws.session_date BETWEEN ? AND ?`, [from, to],
    );

    const best = await db.getFirstAsync<{ name: string; weight: number; reps: number }>(
      `SELECT e.name, ss.weight, ss.reps FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       JOIN exercises e ON e.id = se.exercise_id
       WHERE ss.is_completed = 1 AND ss.weight IS NOT NULL AND ws.finished_at IS NOT NULL
         AND ws.session_date BETWEEN ? AND ?
       ORDER BY (ss.weight * ss.reps) DESC LIMIT 1`, [from, to],
    );

    const zoneRows = await db.getAllAsync<{ zones: string | null; volume: number }>(
      `SELECT COALESCE(e.muscle_zones, e.muscle_primary) AS zones,
              SUM(COALESCE(ss.weight,0) * COALESCE(ss.reps,0)) AS volume
       FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       JOIN exercises e ON e.id = se.exercise_id
       WHERE ss.is_completed = 1 AND ws.finished_at IS NOT NULL AND ws.session_date BETWEEN ? AND ?
       GROUP BY zones`, [from, to],
    );
    const byZone = new Map<string, number>();
    for (const r of zoneRows) {
      for (const z of (r.zones ?? '').split(',').map(x => x.trim()).filter(Boolean)) {
        byZone.set(z, (byZone.get(z) ?? 0) + r.volume / Math.max(1, (r.zones ?? '').split(',').length));
      }
    }
    const topZones = [...byZone.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const gymDates = await db.getAllAsync<{ session_date: string }>(
      'SELECT DISTINCT session_date FROM workout_sessions WHERE finished_at IS NOT NULL AND session_date BETWEEN ? AND ? ORDER BY session_date', [from, to],
    );

    const prsWeek = await db.getAllAsync<{ name: string; weight: number; reps: number }>(
      `SELECT e.name, ss.weight, ss.reps FROM session_sets ss
       JOIN session_exercises se ON se.id = ss.session_exercise_id
       JOIN workout_sessions ws ON ws.id = se.session_id
       JOIN exercises e ON e.id = se.exercise_id
       WHERE ss.is_pr = 1 AND ws.finished_at IS NOT NULL AND ws.session_date BETWEEN ? AND ?`, [from, to],
    );

    // Semana anterior (comparación)
    const [fy, fm, fd] = from.split('-').map(Number) as [number, number, number];
    const prevTo = new Date(fy, fm - 1, fd - 1);
    const prevFrom = new Date(fy, fm - 1, fd - 7);
    const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const prevSessions = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM workout_sessions WHERE finished_at IS NOT NULL AND session_date BETWEEN ? AND ?',
      [fmtD(prevFrom), fmtD(prevTo)],
    );
    const delta = summary.gymSessions - (prevSessions?.n ?? 0);

    const zoneHtml = topZones.map(([z, v]) => `<span class="tag tag-gym">${esc(z)} · ${Math.round(v).toLocaleString()} kg</span>`).join('');
    const prsHtml = prsWeek.length > 0
      ? `<h2>🏆 Récords de la semana</h2>${prsWeek.map(p => `<div class="gratitude-item"><span>🏆</span><span class="pr-line">${esc(p.name)}: ${p.weight} kg × ${p.reps}</span></div>`).join('')}`
      : '';
    const gymDaysHtml = gymDates.length > 0
      ? `<p class="muted" style="margin-top:6px">Días de gym: ${gymDates.map(g => longDateEs(g.session_date).replace(/^\w+ /, '')).join(' · ')}</p>`
      : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      ${headerHtml('RESUMEN SEMANAL', esc(`${from} → ${to}`), delta === 0 ? 'Igual que la semana anterior' : delta > 0 ? `📈 ${delta} sesión${delta > 1 ? 'es' : ''} más que la semana anterior` : `📉 ${Math.abs(delta)} sesión${delta < -1 ? 'es' : ''} menos que la semana anterior`)}
      <h2 class="gym">🏋️ Entrenamiento</h2>
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#C67B5C">${summary.gymSessions}</div><div class="l">Sesiones</div></div>
        <div class="stat"><div class="n" style="color:#3E6B60">${summary.totalSets}</div><div class="l">Series</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${(volRow?.volume ?? 0).toLocaleString()}</div><div class="l">Volumen kg</div></div>
      </div>
      ${gymDaysHtml}
      ${best ? `<p style="margin:8px 0;font-size:13px">🥇 Mejor marca de la semana: <strong>${esc(best.name)}</strong> — <span class="pr-line">${best.weight} kg × ${best.reps}</span></p>` : ''}
      ${zoneHtml ? `<h2>Zonas trabajadas</h2><div>${zoneHtml}</div>` : ''}
      ${prsHtml}
      <h2>📓 Bienestar</h2>
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#3E6B60">${summary.diaryEntries}</div><div class="l">Días escritos</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${summary.avgMood ?? '—'}</div><div class="l">Ánimo medio</div></div>
        <div class="stat"><div class="n" style="color:#7A6FB0">${summary.avgSleep != null ? summary.avgSleep + 'h' : '—'}</div><div class="l">Sueño medio</div></div>
        <div class="stat"><div class="n" style="color:#C67B5C">${summary.habitsDone}</div><div class="l">Hábitos ✓</div></div>
      </div>
      ${footerHtml()}
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Exporta el PLAN semanal + progreso real (pestaña Mi Semana) */
  async exportWeeklyPlan(plan: WeeklyPlan, items: WeeklyPlanItem[], progress: WeekProgress): Promise<string> {
    const db = await getDatabase();
    const DAY_LETTERS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    let daysHtml = '';
    for (let day = 1; day <= 7; day++) {
      const idx = day - 1;
      const [y, m, d] = plan.weekStart.split('-').map(Number) as [number, number, number];
      const dt = new Date(y, m - 1, d + idx);
      const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const done = progress.completedDates.includes(iso);
      const dayItems = items.filter(i => i.dayOfWeek === day);
      const label = dayItems.length > 0 ? dayItems.map(i => i.routineName).join(' + ') : 'Descanso';
      daysHtml += `<div class="plan-day ${done ? 'done' : ''}">
        <div class="day-letter">${DAY_LETTERS[idx]?.slice(0, 3).toUpperCase()}</div>
        <div class="day-date">${dt.getDate()}/${dt.getMonth() + 1}</div>
        <div class="day-routines">${esc(label)}</div>
        <div class="day-status">${done ? '✅' : dayItems.length > 0 ? '⏳' : '·'}</div>
      </div>`;
    }

    // Detalle de rutinas del plan
    const routineIds = [...new Set(items.map(i => i.routineId))];
    let routinesHtml = '';
    for (const rid of routineIds) {
      const r = await db.getFirstAsync<{ name: string }>('SELECT name FROM routines WHERE id = ?', [rid]);
      const exs = await db.getAllAsync<{ name: string }>(
        `SELECT e.name FROM routine_exercises re JOIN exercises e ON e.id = re.exercise_id WHERE re.routine_id = ? ORDER BY re.order_index`, [rid],
      );
      const days = items.filter(i => i.routineId === rid).map(i => DAY_LETTERS[i.dayOfWeek - 1]?.slice(0, 3)).join(', ');
      routinesHtml += `<h2 class="gym">${esc(r?.name ?? 'Rutina')} <span class="muted">— ${esc(days)}</span></h2>
        <div>${exs.map(e => `<span class="tag tag-gym">${esc(e.name)}</span>`).join('')}</div>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      ${headerHtml('MI SEMANA · PLAN DE ENTRENAMIENTO', `${plan.weekStart} → ${plan.weekEnd}`, `${items.length} rutina${items.length !== 1 ? 's' : ''} planificada${items.length !== 1 ? 's' : ''} · ${progress.completedRoutines.length > 0 ? `realizadas: ${esc(progress.completedRoutines.join(', '))}` : 'aún sin sesiones registradas'}`)}
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#3E6B60">${progress.completionPct}%</div><div class="l">Cumplido</div></div>
        <div class="stat"><div class="n" style="color:#C67B5C">${progress.completedCount}/${progress.plannedCount}</div><div class="l">Días cumplidos</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${progress.totalSessions}</div><div class="l">Sesiones</div></div>
        <div class="stat"><div class="n" style="color:#7A6FB0">${progress.totalSets}</div><div class="l">Series</div></div>
        <div class="stat"><div class="n" style="color:#8A5B14">${progress.totalVolume.toLocaleString()}</div><div class="l">Volumen kg</div></div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${progress.completionPct}%"></div></div>
      <h2>🗓️ Plan día a día</h2>
      ${daysHtml}
      ${routinesHtml}
      ${footerHtml()}
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Comparte el PDF — maneja errores de Expo Go */
  async share(uri: string): Promise<void> {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new AppError('NOT_FOUND', 'Compartir no disponible en este dispositivo');
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
  },

  /**
   * Genera imagen para redes sociales (1080x1080 estética).
   * Devuelve la ruta del archivo HTML renderizable + imagen.
   *
   * `style`:
   *  - 'electric' → oscuro + neón + glow + gráfico de barras (muy visual, Stories/Reels)
   *  - 'clay'     → identidad visual Warm Clay Editorial (coherente con la app)
   *
   * `ring`, `bars` y `zones` son opcionales: si vienen, se dibujan anillo de
   * cumplimiento, barras por día y barras de zonas musculares.
   */
  async exportSocialImage(data: {
    style?: 'electric' | 'clay';
    title: string;
    titleAccent?: string;
    subtitle: string;
    stats: Array<{ value: string; label: string; color: string; icon?: string }>;
    ring?: { pct: number; label: string; colorA: string; colorB: string };
    bars?: { label: string; value: number; highlight?: boolean }[];
    zones?: { name: string; value: number }[];
    best?: string;
    footer?: string;
  }): Promise<string> {
    const style = data.style ?? 'clay';
    const dateStr = new Date().toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });

    // ── anillo de cumplimiento (SVG, funciona en WebKit) ──
    const ringHtml = (() => {
      if (!data.ring) return '';
      const C = 527.8; // 2π·84
      const off = C * (1 - Math.min(100, Math.max(0, data.ring.pct)) / 100);
      return `
        <div class="ring-wrap">
          <svg viewBox="0 0 200 200">
            <defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${data.ring.colorA}"/><stop offset="1" stop-color="${data.ring.colorB}"/>
            </linearGradient></defs>
            <circle cx="100" cy="100" r="84" fill="none" stroke="${style === 'electric' ? '#161c2b' : '#EDE5DA'}" stroke-width="20"/>
            <circle cx="100" cy="100" r="84" fill="none" stroke="url(#ringg)" stroke-width="20"
              stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${off}" transform="rotate(-90 100 100)"
              ${style === 'electric' ? 'style="filter: drop-shadow(0 0 12px rgba(0,240,255,.8));"' : ''}/>
          </svg>
          <div class="ring-num">${Math.round(data.ring.pct)}%</div>
        </div>
        <div class="ring-lbl">${esc(data.ring.label)}</div>`;
    })();

    // ── barras por día (normalizadas) ──
    const barsHtml = (() => {
      const bars = data.bars ?? [];
      if (bars.length === 0) return '';
      const max = Math.max(...bars.map(b => b.value), 1);
      let peak = bars[0] ?? { label: '—', value: 0 };
      for (const b of bars) if (b.value > peak.value) peak = b;
      const cols = bars.map(b => {
        const h = Math.max(8, Math.round((b.value / max) * 100));
        const hi = b.highlight || b.value === peak.value;
        return `<div class="bcol"><div class="bbar ${hi ? 'hi' : ''}" style="height:${h}%"></div><div class="blab">${esc(b.label)}</div></div>`;
      }).join('');
      return `
        <div class="chart-card">
          <div class="chart-head">
            <div class="chart-title">Volumen por día (kg)</div>
            <div class="chart-peak">▲ pico: ${esc(peak.label)} ${fmtCompact(peak.value)}</div>
          </div>
          <div class="bars">${cols}</div>
        </div>`;
    })();

    // ── zonas musculares (barras horizontales) ──
    const zonesHtml = (() => {
      if (!data.zones?.length) return '';
      const max = Math.max(...data.zones.map(z => z.value), 1);
      const rows = data.zones.slice(0, 4).map(z => `
        <div class="zrow">
          <div class="zname">${esc(z.name)}</div>
          <div class="ztrack"><div class="zfill" style="width:${Math.max(6, Math.round((z.value / max) * 100))}%"></div></div>
          <div class="zval">${fmtCompact(z.value)}</div>
        </div>`).join('');
      return `
        <div class="zones-card">
          <div class="zones-title">Zonas trabajadas (kg)</div>
          ${rows}
        </div>`;
    })();

    const html = style === 'electric'
      ? electricBody(data, { ringHtml, barsHtml, dateStr })
      : clayBody(data, { ringHtml, zonesHtml, dateStr });

    const { uri } = await Print.printToFileAsync({ html, width: 1080, height: 1080 });
    return uri;
  },

  /** Comparte imagen/HTML para redes sociales */
  async shareSocial(uri: string): Promise<void> {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new AppError('NOT_FOUND', 'Compartir no disponible');
    await Sharing.shareAsync(uri, { dialogTitle: 'Compartir en redes' });
  },
};
