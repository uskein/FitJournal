/**
 * seed-emulator-db.mjs — siembra datos de demostración REALISTAS para las
 * capturas de presentación de DiarioFit. Corre en el host sobre la copia de
 * `fitjournal.db` creada por la app en el emulador (la app ya puso la
 * biblioteca de ejercicios, plantillas y prompts en el primer arranque).
 *
 * Uso:  node Artefactos/presentacion/seed-emulator-db.mjs <ruta-fitjournal.db>
 * Idempotente: limpia SOLO sus propias tablas (respeta exercises/templates/
 * prompts/seed_version de la app) y vuelve a insertar.
 */
import Database from 'better-sqlite3';

const dbPath = process.argv[2];
if (!dbPath) {
  console.error('Uso: node seed-emulator-db.mjs <ruta-fitjournal.db>');
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = new Date();
today.setHours(0, 0, 0, 0);
const at = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};
const nowIso = new Date().toISOString();

// ---------- limpieza idempotente (solo tablas nuestras) ----------
db.exec(`
  DELETE FROM weekly_plan_items; DELETE FROM weekly_plans;
  DELETE FROM goal_logs;         DELETE FROM goals;
  DELETE FROM habit_logs;        DELETE FROM habits;
  DELETE FROM session_sets;      DELETE FROM session_exercises;
  DELETE FROM workout_sessions;
  DELETE FROM routine_exercises; DELETE FROM routines;
  DELETE FROM body_measurements;
  DELETE FROM word_of_day; DELETE FROM day_colors; DELETE FROM sketches;
  DELETE FROM audio_notes; DELETE FROM wellness_metrics;
  DELETE FROM gratitude_items; DELETE FROM mood_entries;
  DELETE FROM diary_entry_tags; DELETE FROM tags;
  DELETE FROM diary_entries;
  DELETE FROM settings WHERE key IN ('user_name','user_weight','user_goal');
`);

// ---------- perfil ----------
db.exec(`
  INSERT INTO settings (key, value) VALUES
    ('user_name',  'Alex Rivera'),
    ('user_weight','74.3'),
    ('user_goal',  'Ganar fuerza y correr 21K');
`);

// ---------- rutinas ----------
const exId = (name) => {
  const row = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name);
  if (!row) throw new Error(`Ejercicio no encontrado en la biblioteca: ${name}`);
  return row.id;
};

const ROUTINES = [
  { name: 'Full Body A', description: 'Fuerza total · 3 días/semana', ex: ['Sentadilla con barra', 'Press de banca con barra', 'Remo con barra', 'Curl de bíceps con barra', 'Plancha frontal'] },
  { name: 'Tren Superior', description: 'Empuje, tirón y hombros', ex: ['Dominadas', 'Press militar con barra', 'Remo con mancuerna a una mano', 'Elevaciones laterales', 'Extensión de tríceps en polea'] },
  { name: 'Piernas & Core', description: 'Posterior, cuádriceps y core', ex: ['Peso muerto rumano', 'Zancadas caminando', 'Prensa de piernas', 'Rueda abdominal', 'Elevación de talones'] },
];
const routineIds = [];
const insRoutine = db.prepare('INSERT INTO routines (name, description, is_archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)');
const insRoutineEx = db.prepare('INSERT INTO routine_exercises (routine_id, exercise_id, order_index, target_sets, target_reps, target_weight, rest_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (const r of ROUTINES) {
  const { lastInsertRowid } = insRoutine.run(r.name, r.description, nowIso, nowIso);
  routineIds.push(Number(lastInsertRowid));
  r.ex.forEach((name, i) => insRoutineEx.run(lastInsertRowid, exId(name), i + 1, 4, 8, null, 90));
}

// ---------- sesiones de gym (últimas 5 semanas, 3/semana) ----------
const BASE = { // peso base de la semana actual (progresión: más antiguo = menos)
  'Sentadilla con barra': { w: 80, reps: 5 },
  'Press de banca con barra': { w: 65, reps: 6 },
  'Remo con barra': { w: 60, reps: 8 },
  'Curl de bíceps con barra': { w: 30, reps: 10 },
  'Dominadas': { w: 0, reps: 8 },
  'Press militar con barra': { w: 45, reps: 6 },
  'Remo con mancuerna a una mano': { w: 32, reps: 8 },
  'Elevaciones laterales': { w: 12, reps: 12 },
  'Extensión de tríceps en polea': { w: 35, reps: 12 },
  'Peso muerto rumano': { w: 90, reps: 6 },
  'Zancadas caminando': { w: 20, reps: 10 },
  'Prensa de piernas': { w: 140, reps: 10 },
  'Rueda abdominal': { w: 0, reps: 12 },
  'Elevación de talones': { w: 60, reps: 15 },
};

const insSession = db.prepare('INSERT INTO workout_sessions (routine_id, session_date, started_at, finished_at, duration_min, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insSEx = db.prepare('INSERT INTO session_exercises (session_id, exercise_id, order_index, notes) VALUES (?, ?, ?, NULL)');
const insSet = db.prepare('INSERT INTO session_sets (session_exercise_id, set_number, weight, reps, rpe, is_completed, is_pr, rest_seconds) VALUES (?, ?, ?, ?, ?, 1, ?, ?)');

// offsets negativos: lun/mié/vie de las últimas 5 semanas (0 = hoy libre)
const SESSION_DAYS = [-2, -4, -6, -9, -11, -13, -16, -18, -20, -23, -25, -27];
const SESSION_NOTES = ['Buen ritmo, me sentí fuerte.', 'Algo cansado pero completé la rutina.', 'PR en el ejercicio principal.', 'Clase guiada, buena técnica.', null, null];
let sessionCount = 0;
for (const off of SESSION_DAYS) {
  const routineIdx = sessionCount % ROUTINES.length;
  const routine = ROUTINES[routineIdx];
  const date = at(off);
  const weekBack = Math.floor(Math.abs(off) / 7);
  const startH = 7 + (sessionCount % 3);
  const dur = 52 + ((sessionCount * 7) % 22);
  const { lastInsertRowid: sid } = insSession.run(
    routineIds[routineIdx], date,
    `${date}T${pad(startH)}:05:00.000Z`, `${date}T${pad(startH)}:${pad(dur % 60)}:00.000Z`.replace(/:(\d\d):00\.000Z$/, (m, mm) => `:${mm}:00.000Z`),
    dur, SESSION_NOTES[sessionCount % SESSION_NOTES.length], nowIso,
  );
  // fecha de fin coherente: started + dur minutos (simple y legible)
  const isLatest = off === SESSION_DAYS[0];
  routine.ex.slice(0, 4).forEach((name, i) => {
    const { lastInsertRowid: seid } = insSEx.run(sid, exId(name), i + 1);
    const base = BASE[name];
    const lift = Math.max(0, base.w - weekBack * 2.5);
    const w = lift > 0 ? Math.round(lift * 2) / 2 : null;
    const sets = i === 0 ? 4 : 3;
    for (let s = 1; s <= sets; s++) {
      const pr = isLatest && i === 0 && s === sets ? 1 : 0;
      insSet.run(seid, s, w, base.reps, 7 + ((s + i) % 3), pr, 90);
    }
  });
  sessionCount += 1;
}

// ---------- entradas del diario (racha de 14 días + sueltas) ----------
const ENTRY_OFFS = [0, -1, -2, -3, -4, -5, -6, -7, -8, -9, -10, -11, -12, -13, -15, -18, -20];
const NOTES = [
  'Arranqué el día con calma: café, planificación y una hora de trabajo sin notificaciones. Cerré la entrega que venía arrastrando y por fin sentí el cierre.',
  'Entrené por la mañana y todo el día con más energía. Anoté la rutina completa en el diario antes de ducharme, costumbre que me está funcionando muy bien.',
  'Día intenso en el trabajo pero estable. Llamé a mamá por la tarde y reímos mucho con lo del perrito de los vecinos.',
  'Sueño de 8 horas seguidas, se nota en el ánimo. Fui a caminar al parque y vi el atardecer desde el mirador.',
  'Un poco de prisa por la mañana, pero el entrenamiento salió bien. Probé un ejercicio nuevo de hombro y me tiró al día siguiente.',
  'Día tranquilo. Leí 30 páginas del libro y preparé la comida de la semana. La constancia gana a la motivación.',
  'Frío y lluvioso, pero cumplí con ir al gimnasio igual. Volver a casa caliente con sopa fue lo mejor del día.',
  'Hoy toca descanso activo: estiramientos y una caminata larga. El cuerpo pide aire después de una semana pesada.',
  'Presenté el avance del proyecto y salió mejor de lo esperado. Celebré con un helado, sin culpa.',
  'Mañana de rutina perfecta: agua, estiramientos y desayuno sentado. Pequeños rituales que cambian el tono del día.',
  'Conversación difícil pero necesaria. Escribir aquí me ayudó a ordenar las ideas antes de dormir.',
  'Día de lavandería, mercado y orden en casa. La calma también se entrena en lo cotidiano.',
  'Terminé el libro que dejé pendiente hace meses. La última página me dejó pensando toda la tarde.',
  'Buena energía general. Preparé las mochilas para el paseo del fin de semana y dormí de madrugada.',
  'Día largo de reuniones, pero la tarde la rescaté con una sesión corta de pesas y estiramientos.',
  'Sábado simple: música, cocina y una siesta que se fue de largo. Justo lo que necesitaba.',
  'Domingo de planificación semanal. Escribí mis tres prioridades y solté lo que no depende de mí.',
];
const MOODS = [4, 5, 4, 5, 3, 4, 3, 4, 5, 4, 3, 4, 4, 5, 3, 4, 5];
const WEATHER = ['☀️', '⛅', '🌤️', '🌧️', '☀️', '🌥️'];
const MOOD_COLOR = { 5: '#4E8C6A', 4: '#3E6B60', 3: '#E0A458', 2: '#C67B5C', 1: '#C0504D' };
const GRATITUDES = [
  'Por mi cuerpo, que me sigue respondiendo', 'Por la tarde en familia', 'Por el café con Ana',
  'Por terminar el libro', 'Por el sol de la tarde', 'Por la energía de hoy',
  'Por la ducha caliente después del gym', 'Por llamar a mamá', 'Por un día sin prisa',
  'Por la cama y las sábanas limpias',
];
const TAGS = ['trabajo', 'familia', 'entrenamiento', 'salud', 'sueño', 'amigos'];

const insEntry = db.prepare(`INSERT INTO diary_entries
  (entry_date, mood, energy, sleep_hours, body_weight, weather, notes, created_at, updated_at, sleep_quality, weather_icon, is_closed)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const insColor = db.prepare('INSERT INTO day_colors (entry_id, color) VALUES (?, ?)');
const insWord = db.prepare('INSERT INTO word_of_day (entry_id, word) VALUES (?, ?)');
const insGrat = db.prepare('INSERT INTO gratitude_items (entry_id, text, created_at) VALUES (?, ?, ?)');
const insTag = db.prepare('INSERT INTO tags (name) VALUES (?) ON CONFLICT(name) DO NOTHING');
const insLink = db.prepare('INSERT OR IGNORE INTO diary_entry_tags (entry_id, tag_id) VALUES (?, ?)');
const insMoodE = db.prepare('INSERT INTO mood_entries (entry_id, emotion, intensity, context) VALUES (?, ?, ?, ?)');
const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');

const WORDS = { 0: 'constancia', '-2': 'enfoque', '-5': 'gratitud', '-9': 'energía', '-13': 'calma' };

for (let i = 0; i < ENTRY_OFFS.length; i++) {
  const off = ENTRY_OFFS[i];
  const date = at(off);
  const mood = MOODS[i % MOODS.length];
  const weight = Math.round((76.8 + off * 0.115) * 10) / 10; // tendencia a la baja
  const closed = off <= -3 ? 1 : 0;
  const { lastInsertRowid: eid } = insEntry.run(
    date, mood, 3 + ((i + 1) % 3), 6.5 + ((i * 3) % 4) * 0.5, weight,
    WEATHER[i % WEATHER.length], NOTES[i], nowIso, nowIso,
    3 + ((i + 2) % 3), WEATHER[i % WEATHER.length], closed,
  );
  insColor.run(eid, MOOD_COLOR[mood]);
  if (WORDS[off]) insWord.run(eid, WORDS[off]);
  insGrat.run(eid, GRATITUDES[i % GRATITUDES.length], nowIso);
  if (i % 3 === 0) insGrat.run(eid, GRATITUDES[(i + 4) % GRATITUDES.length], nowIso);

  for (const t of [TAGS[i % TAGS.length], TAGS[(i + 2) % TAGS.length]]) {
    insTag.run(t);
    insLink.run(eid, getTag.get(t).id);
  }
  if (off >= -2) insMoodE.run(eid, mood >= 4 ? 'motivado' : 'contemplativo', mood, 'general');
}

// ---------- hábitos ----------
const HABITS = [
  { name: 'Leer 20 min', icon: '📖', color: '#7A6FB0' },
  { name: 'Meditar', icon: '🧘', color: '#5B8FA8' },
  { name: 'Beber 2L de agua', icon: '💧', color: '#3E6B60' },
];
const insHabit = db.prepare('INSERT INTO habits (name, icon, color, is_active, created_at) VALUES (?, ?, ?, 1, ?)');
const insLog = db.prepare('INSERT INTO habit_logs (habit_id, log_date, done) VALUES (?, ?, ?)');
for (let h = 0; h < HABITS.length; h++) {
  const { lastInsertRowid: hid } = insHabit.run(HABITS[h].name, HABITS[h].icon, HABITS[h].color, nowIso);
  for (let off = -27; off <= 0; off++) {
    // patrón determinista: hoy solo el primero marcado (la pantalla se ve viva)
    const done = off === 0 ? (h === 0 ? 1 : 0) : ((Math.abs(off) * (h + 3) + h) % 7 !== 3) ? 1 : 0;
    insLog.run(hid, at(off), done);
  }
}

// ---------- medidas corporales ----------
const insMeas = db.prepare(`INSERT INTO body_measurements
  (date, weight, chest, waist, hips, arm_left, arm_right, thigh_left, thigh_right, neck, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const MEAS = [
  { off: -3, w: 74.3, chest: 101.5, waist: 83.2, hips: 96.4, arm: 35.2, neck: 37.5, notes: 'Tras la semana de volumen' },
  { off: -10, w: 74.9, chest: 101.0, waist: 84.1, hips: 96.9, arm: 35.0, neck: 37.6, notes: null },
  { off: -17, w: 75.4, chest: 100.6, waist: 84.8, hips: 97.2, arm: 34.8, neck: 37.8, notes: null },
  { off: -24, w: 75.9, chest: 100.2, waist: 85.4, hips: 97.6, arm: 34.6, neck: 37.9, notes: 'Inicio del bloque' },
  { off: -31, w: 76.4, chest: 99.8, waist: 86.0, hips: 98.0, arm: 34.4, neck: 38.0, notes: null },
  { off: -38, w: 76.8, chest: 99.4, waist: 86.5, hips: 98.5, arm: 34.2, neck: 38.1, notes: null },
];
for (const m of MEAS) {
  insMeas.run(at(m.off), m.w, m.chest, m.waist, m.hips, m.arm, m.arm - 0.2, m.arm - 3.4, m.arm - 3.6, m.neck, m.notes);
}

// ---------- plan semanal ----------
const monday = new Date(today);
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
const sunday = new Date(monday);
sunday.setDate(sunday.getDate() + 6);
const insPlan = db.prepare('INSERT INTO weekly_plans (week_start, week_end, label, created_at) VALUES (?, ?, ?, ?)');
const insItem = db.prepare('INSERT INTO weekly_plan_items (plan_id, routine_id, day_of_week, notes, created_at) VALUES (?, ?, ?, ?, ?)');
const { lastInsertRowid: planId } = insPlan.run(isoOf(monday), isoOf(sunday), 'Bloque de fuerza', nowIso);
insItem.run(planId, routineIds[0], 2, 'Enfocada en la técnica del sentadilla', nowIso); // martes
insItem.run(planId, routineIds[1], 4, null, nowIso); // jueves
insItem.run(planId, routineIds[2], 6, null, nowIso); // sábado

// ---------- metas ----------
const insGoal = db.prepare('INSERT INTO goals (title, target_date, progress, status, created_at) VALUES (?, ?, ?, ?, ?)');
const target = new Date(today);
target.setDate(target.getDate() + 70);
const target2 = new Date(today);
target2.setDate(target2.getDate() + 95);
insGoal.run('Correr 21K en 12 semanas', isoOf(target), 0.35, 'active', nowIso);
insGoal.run('Sentadilla a 100 kg', isoOf(target2), 0.6, 'active', nowIso);

// ---------- integridad final ----------
db.pragma('wal_checkpoint(TRUNCATE)');
const integrity = db.prepare('PRAGMA integrity_check').get();
console.log('integrity_check:', Object.values(integrity)[0]);
console.log('seed OK:', {
  entradas: db.prepare('SELECT COUNT(*) c FROM diary_entries').get().c,
  sesiones: db.prepare('SELECT COUNT(*) c FROM workout_sessions').get().c,
  habitos: db.prepare('SELECT COUNT(*) c FROM habits').get().c,
  medidas: db.prepare('SELECT COUNT(*) c FROM body_measurements').get().c,
  rutinas: db.prepare('SELECT COUNT(*) c FROM routines').get().c,
});
db.close();
