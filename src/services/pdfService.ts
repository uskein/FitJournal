import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';

/**
 * pdfService — export PDF de días y sesiones de entrenamiento.
 * Genera HTML con los datos → Print.printToFileAsync → Sharing para compartir.
 */

function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const CSS = `
  body { font-family: -apple-system, sans-serif; padding: 40px; color: #2B2B2B; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  h2 { font-size: 18px; color: #3E6B60; border-bottom: 2px solid #DCE9E4; padding-bottom: 6px; margin: 24px 0 12px; }
  .kicker { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #6E6A65; font-weight: 700; }
  .big { font-family: monospace; font-size: 36px; font-weight: 700; color: #C67B5C; }
  .muted { color: #6E6A65; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6E6A65; padding: 6px 8px; border-bottom: 2px solid #E8E0D6; }
  td { padding: 8px; border-bottom: 1px solid #F0EBE3; font-size: 14px; }
  .tag { display: inline-block; background: #DCE9E4; color: #3E6B60; padding: 2px 10px; border-radius: 999px; font-size: 12px; margin: 2px; }
  .tag-gym { background: #F3E1D8; color: #8F4E33; }
  .badge { display: inline-block; background: #FCEFD9; color: #8A5B14; padding: 2px 10px; border-radius: 999px; font-size: 12px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E8E0D6; font-size: 11px; color: #A8A29A; text-align: center; }
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

      const rows = sets.map(s => `
        <tr>
          <td>${s.set_number}</td>
          <td>${s.weight != null ? s.weight + ' kg' : '—'}</td>
          <td>${s.reps ?? '—'}</td>
          <td>${s.rpe ?? '—'}</td>
          <td>${s.is_pr ? '🏆 PR' : '✓'}</td>
        </tr>`).join('');

      exercisesHtml += `
        <h2>${esc(ex.name)}</h2>
        <table><tr><th>Serie</th><th>Peso</th><th>Reps</th><th>RPE</th><th>Estado</th></tr>${rows}</table>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="kicker">FITJOURNAL · SESIÓN DE ENTRENAMIENTO</div>
      <h1>${esc(session.session_date)}</h1>
      <p class="muted">${session.duration_min ? session.duration_min + ' minutos · ' : ''}${exercises.length} ejercicios · ${totalSets} series</p>
      ${exercisesHtml}
      <h2>Resumen</h2>
      <table>
        <tr><td>Ejercicios</td><td><b>${exercises.length}</b></td></tr>
        <tr><td>Series totales</td><td><b>${totalSets}</b></td></tr>
        <tr><td>Volumen (kg × reps)</td><td><b>${totalWeight.toLocaleString()}</b></td></tr>
      </table>
      ${session.notes ? `<h2>Notas</h2><p>${esc(session.notes)}</p>` : ''}
      <div class="footer">FitJournal · Exportado el ${new Date().toLocaleDateString('es')}</div>
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
        `SELECT e.name FROM session_exercises se JOIN exercises e ON e.id = se.exercise_id WHERE se.session_id = ? ORDER BY se.order_index`,
        [session.id],
      );
      const sets = await db.getAllAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM session_sets ss JOIN session_exercises se ON se.id = ss.session_exercise_id WHERE se.session_id = ? AND ss.is_completed = 1`,
        [session.id],
      );
      sessionHtml = `
        <h2>🏋️ Entrenamiento</h2>
        <p class="muted">${session.duration_min ?? '?'} min · ${exercises.length} ejercicios · ${sets[0]?.n ?? 0} series</p>
        <div>${exercises.map(e => `<span class="tag tag-gym">${esc(e.name)}</span>`).join('')}</div>`;
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="kicker">FITJOURNAL · MI DÍA</div>
      <h1>${esc(date)}</h1>

      ${entry ? `
        <h2>📓 Estado del día</h2>
        <table>
          ${entry.mood ? `<tr><td>Ánimo</td><td><b>${entry.mood}/5</b></td></tr>` : ''}
          ${entry.energy ? `<tr><td>Energía</td><td><b>${entry.energy}/5</b></td></tr>` : ''}
          ${entry.sleep_hours != null ? `<tr><td>Sueño</td><td><b>${entry.sleep_hours} h</b></td></tr>` : ''}
          ${entry.body_weight != null ? `<tr><td>Peso</td><td><b>${entry.body_weight} kg</b></td></tr>` : ''}
        </table>
        ${entry.notes ? `<p>${esc(entry.notes)}</p>` : ''}
      ` : '<p class="muted">Sin entrada de diario para este día.</p>'}

      ${gratitudes.length > 0 ? `
        <h2>🙏 Gratitud</h2>
        ${gratitudes.map(g => `<p>• ${esc(g.text)}</p>`).join('')}
      ` : ''}

      ${sessionHtml}

      <div class="footer">FitJournal · Exportado el ${new Date().toLocaleDateString('es')}</div>
    </body></html>`;

    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Exporta el resumen semanal a PDF */
  async exportWeeklySummary(summary: { gymSessions: number; diaryEntries: number; habitsDone: number; avgSleep: number | null; avgMood: number | null; totalSets: number; }, weekLabel: string): Promise<string> {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <div class="kicker">FITJOURNAL · RESUMEN SEMANAL</div>
      <h1>${esc(weekLabel)}</h1>
      <h2>🏋️ Entrenamiento</h2>
      <table>
        <tr><td>Sesiones de gym</td><td><b>${summary.gymSessions}</b></td></tr>
        <tr><td>Series totales</td><td><b>${summary.totalSets}</b></td></tr>
      </table>
      <h2>📓 Diario</h2>
      <table>
        <tr><td>Días escritos</td><td><b>${summary.diaryEntries}</b></td></tr>
        ${summary.avgMood ? `<tr><td>Ánimo promedio</td><td><b>${summary.avgMood}/5</b></td></tr>` : ''}
        ${summary.avgSleep ? `<tr><td>Sueño promedio</td><td><b>${summary.avgSleep}h</b></td></tr>` : ''}
      </table>
      <h2>✅ Hábitos</h2>
      <table><tr><td>Hábitos completados</td><td><b>${summary.habitsDone}</b></td></tr></table>
      <div class="footer">FitJournal · Generado el ${new Date().toLocaleDateString('es')}</div>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },

  /** Comparte el PDF generado */
  async share(uri: string): Promise<void> {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) throw new AppError('NOT_FOUND', 'Compartir no disponible en este dispositivo');
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
  },
};
