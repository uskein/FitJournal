import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; padding: 36px; color: #2B2B2B; background: #FAF6F0; }
  .header { margin-bottom: 24px; }
  .kicker { font-size: 9px; letter-spacing: 3px; text-transform: uppercase; color: #6E6A65; font-weight: 700; }
  h1 { font-size: 26px; font-weight: 700; margin-top: 4px; color: #2B2B2B; }
  h2 { font-size: 15px; color: #3E6B60; border-bottom: 2px solid #DCE9E4; padding-bottom: 4px; margin: 20px 0 10px; font-weight: 700; }
  .big { font-family: 'SF Mono', monospace; font-size: 32px; font-weight: 700; color: #C67B5C; }
  .muted { color: #6E6A65; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6E6A65; padding: 5px 6px; border-bottom: 2px solid #E8E0D6; }
  td { padding: 6px; border-bottom: 1px solid #F0EBE3; font-size: 13px; }
  .tag { display: inline-block; background: #DCE9E4; color: #3E6B60; padding: 2px 10px; border-radius: 99px; font-size: 11px; margin: 2px; font-weight: 600; }
  .tag-gym { background: #F3E1D8; color: #8F4E33; }
  .badge { background: #FCEFD9; color: #8A5B14; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .stat-row { display: flex; gap: 16px; margin: 10px 0; }
  .stat { text-align: center; flex: 1; background: #fff; border-radius: 12px; padding: 12px; border: 1px solid #E8E0D6; }
  .stat .n { font-family: monospace; font-size: 24px; font-weight: 700; }
  .stat .l { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6E6A65; margin-top: 2px; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #E8E0D6; font-size: 10px; color: #A8A29A; text-align: center; }
  .brand { font-weight: 700; color: #3E6B60; }
`;

export const pdfService = {
  /** Exporta una sesión de gym completa a PDF */
  async exportSession(sessionId: number): Promise<string> {
    const db = await getDatabase();
    const session = await db.getFirstAsync<{ id: number; session_date: string; duration_min: number | null; notes: string | null }>(
      'SELECT * FROM workout_sessions WHERE id = ?', [sessionId],
    );
    if (!session) throw new AppError('NOT_FOUND', 'Sesión inexistente');

    const exercises = await db.getAllAsync<{ id: number; exercise_id: number; name: string }>(
      `SELECT se.id, se.exercise_id, e.name FROM session_exercises se
       JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`,
      [sessionId],
    );

    let exercisesHtml = '';
    let totalSets = 0;
    let totalWeight = 0;

    for (const ex of exercises) {
      const sets = await db.getAllAsync<{ set_number: number; weight: number | null; reps: number | null; rpe: number | null; is_pr: number }>(
        'SELECT * FROM session_sets WHERE session_exercise_id = ? ORDER BY set_number', [ex.id],
      );
      totalSets += sets.length;
      totalWeight += sets.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0);
      const rows = sets.map(s => `<tr><td>${s.set_number}</td><td>${s.weight != null ? s.weight + ' kg' : '—'}</td><td>${s.reps ?? '—'}</td><td>${s.rpe ?? '—'}</td><td>${s.is_pr ? '🏆' : '✓'}</td></tr>`).join('');
      exercisesHtml += `<h2>${esc(ex.name)}</h2><table><tr><th>#</th><th>Peso</th><th>Reps</th><th>RPE</th><th>✓</th></tr>${rows}</table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="header"><div class="kicker">DiarioFit · SESIÓN DE ENTRENAMIENTO</div><h1>${esc(session.session_date)}</h1>
      <p class="muted">${session.duration_min ?? '?'} min · ${exercises.length} ejercicios · ${totalSets} series</p></div>
      ${exercisesHtml}
      <h2>Resumen</h2>
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#3E6B60">${exercises.length}</div><div class="l">Ejercicios</div></div>
        <div class="stat"><div class="n" style="color:#C67B5C">${totalSets}</div><div class="l">Series</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${totalWeight.toLocaleString()}</div><div class="l">Volumen</div></div>
      </div>
      ${session.notes ? `<h2>Notas</h2><p>${esc(session.notes)}</p>` : ''}
      <div class="footer"><span class="brand">DiarioFit</span> · Exportado el ${new Date().toLocaleDateString('es')}</div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Exporta un día completo (diario + gym) a PDF */
  async exportDay(date: string): Promise<string> {
    const db = await getDatabase();
    const entry = await db.getFirstAsync<{ mood: number | null; energy: number | null; sleep_hours: number | null; body_weight: number | null; notes: string | null }>(
      'SELECT * FROM diary_entries WHERE entry_date = ?', [date],
    );
    const gratitudes = await db.getAllAsync<{ text: string }>(
      'SELECT g.text FROM gratitude_items g JOIN diary_entries de ON de.id = g.entry_id WHERE de.entry_date = ?', [date],
    );
    const session = await db.getFirstAsync<{ id: number; duration_min: number | null }>(
      'SELECT id, duration_min FROM workout_sessions WHERE session_date = ? AND finished_at IS NOT NULL', [date],
    );

    let sessionHtml = '';
    if (session) {
      const exercises = await db.getAllAsync<{ name: string }>(
        `SELECT e.name FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`, [session.id],
      );
      const sets = await db.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id WHERE se.session_id = ? AND ss.is_completed = 1`, [session.id],
      );
      sessionHtml = `<h2>🏋️ Entrenamiento</h2><p class="muted">${session.duration_min ?? '?'} min · ${exercises.length} ejercicios · ${sets?.n ?? 0} series</p><div>${exercises.map(e => `<span class="tag tag-gym">${esc(e.name)}</span>`).join('')}</div>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="header"><div class="kicker">DiarioFit · MI DÍA</div><h1>${esc(date)}</h1></div>
      ${entry ? `<h2>📓 Estado</h2><div class="stat-row">
        ${entry.mood ? `<div class="stat"><div class="n" style="color:#3E6B60">${entry.mood}/5</div><div class="l">Ánimo</div></div>` : ''}
        ${entry.energy ? `<div class="stat"><div class="n" style="color:#E0A458">${entry.energy}/5</div><div class="l">Energía</div></div>` : ''}
        ${entry.sleep_hours != null ? `<div class="stat"><div class="n" style="color:#7A6FB0">${entry.sleep_hours}h</div><div class="l">Sueño</div></div>` : ''}
      </div>${entry.notes ? `<p style="margin-top:8px">${esc(entry.notes)}</p>` : ''}` : '<p class="muted">Sin entrada de diario.</p>'}
      ${gratitudes.length > 0 ? `<h2>🙏 Gratitud</h2>${gratitudes.map(g => `<p style="margin:4px 0">• ${esc(g.text)}</p>`).join('')}` : ''}
      ${sessionHtml}
      <div class="footer"><span class="brand">DiarioFit</span> · Exportado el ${new Date().toLocaleDateString('es')}</div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Exporta el resumen semanal a PDF */
  async exportWeeklySummary(summary: { gymSessions: number; diaryEntries: number; habitsDone: number; avgSleep: number | null; avgMood: number | null; totalSets: number; }, weekLabel: string): Promise<string> {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="header"><div class="kicker">DiarioFit · RESUMEN SEMANAL</div><h1>${esc(weekLabel)}</h1></div>
      <h2>🏋️ Entrenamiento</h2>
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#C67B5C">${summary.gymSessions}</div><div class="l">Sesiones</div></div>
        <div class="stat"><div class="n" style="color:#3E6B60">${summary.totalSets}</div><div class="l">Series</div></div>
      </div>
      <h2>📓 Diario</h2>
      <div class="stat-row">
        <div class="stat"><div class="n" style="color:#3E6B60">${summary.diaryEntries}</div><div class="l">Días</div></div>
        <div class="stat"><div class="n" style="color:#E0A458">${summary.avgMood ?? '—'}</div><div class="l">Ánimo</div></div>
        <div class="stat"><div class="n" style="color:#7A6FB0">${summary.avgSleep ?? '—'}</div><div class="l">Sueño</div></div>
      </div>
      <h2>✅ Hábitos</h2>
      <div class="stat-row"><div class="stat"><div class="n" style="color:#E0A458">${summary.habitsDone}</div><div class="l">Completados</div></div></div>
      <div class="footer"><span class="brand">DiarioFit</span> · ${new Date().toLocaleDateString('es')}</div>
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
      .brand { font-size:18px; font-weight:700; color:#3E6B60; letter-spacing:3px; text-transform:uppercase; margin-bottom:12px; }
      .title { font-size:64px; font-weight:700; color:#2B2B2B; line-height:1.05; margin-bottom:8px; }
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
        <div class="brand">DiarioFit</div>
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
