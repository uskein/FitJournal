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
   */
  async exportSocialImage(data: {
    title: string;
    subtitle: string;
    stats: Array<{ value: string; label: string; color: string }>;
    footer?: string;
  }): Promise<string> {
    const statsHtml = data.stats.map(s =>
      `<div class="s-item"><div class="s-n" style="color:${s.color}">${s.value}</div><div class="s-l">${s.label}</div></div>`
    ).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { width:1080px; height:1080px; overflow:hidden; font-family:'Space Grotesk',sans-serif; background:#FAF6F0; position:relative; }
      .bg-blob { position:absolute; width:600px; height:600px; border-radius:50%; filter:blur(120px); opacity:.35; }
      .blob1 { background:#4E8C6A; top:-200px; right:-100px; }
      .blob2 { background:#E0A458; bottom:-150px; left:-100px; }
      .content { position:relative; z-index:1; padding:80px 70px; height:100%; display:flex; flex-direction:column; }
      .brand-row { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
      .monogram { width:56px; height:56px; border-radius:16px; background:linear-gradient(135deg,#3E6B60,#6FA08F); color:#fff; font-family:'JetBrains Mono',monospace; font-weight:700; font-size:22px; display:flex; align-items:center; justify-content:center; letter-spacing:1px; }
      .brand { font-size:20px; font-weight:700; color:#3E6B60; letter-spacing:4px; text-transform:uppercase; }
      .title { font-size:62px; font-weight:700; color:#2B2B2B; line-height:1.05; margin-bottom:8px; }
      .subtitle { font-size:24px; color:#6E6A65; margin-bottom:50px; }
      .stats { display:flex; gap:20px; flex:1; align-items:center; }
      .s-item { flex:1; background:#fff; border-radius:24px; padding:32px 20px; text-align:center; border:1px solid #E8E0D6; box-shadow:0 8px 24px rgba(62,107,96,.08); }
      .s-n { font-family:'JetBrains Mono',monospace; font-size:52px; font-weight:700; }
      .s-l { font-size:14px; color:#6E6A65; text-transform:uppercase; letter-spacing:2px; margin-top:8px; font-weight:600; }
      .bottom { display:flex; justify-content:space-between; align-items:center; margin-top:auto; }
      .handle { font-size:20px; color:#6E6A65; }
      .date { font-size:16px; color:#A8A29A; }
    </style></head><body>
      <div class="bg-blob blob1"></div>
      <div class="bg-blob blob2"></div>
      <div class="content">
        <div class="brand-row"><div class="monogram">DF</div><div class="brand">DiarioFit</div></div>
        <div class="title">${esc(data.title)}</div>
        <div class="subtitle">${esc(data.subtitle)}</div>
        <div class="stats">${statsHtml}</div>
        <div class="bottom">
          <div class="handle">${esc(data.footer ?? '@DiarioFit')}</div>
          <div class="date">${new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
    </body></html>`;

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
