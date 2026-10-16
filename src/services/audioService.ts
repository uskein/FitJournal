import { Audio } from 'expo-av';
import { Directory, File, Paths } from 'expo-file-system';
import { AppError } from '@/core/errors';
import { getDatabase } from '@/core/db/database';

/**
 * audioService — PLAN_DE_SPRINTS §5.3 · HU-09
 * Notas de voz: grabación (expo-av) → archivo en FileSystem → fila en audio_notes.
 * Borde B2: permiso denegado → AppError PERMISSION_DENIED (UI guía, no rompe).
 */

const VOICE_DIR_NAME = 'voice';

function voiceDir(): Directory {
  const dir = new Directory(Paths.document, VOICE_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

let currentRecording: Audio.Recording | null = null;

export const audioService = {
  async startRecording(): Promise<void> {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      throw new AppError(
        'PERMISSION_DENIED',
        'Permiso de micrófono denegado. Actívalo en Ajustes del sistema.',
      );
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    currentRecording = recording;
  },

  /** Detiene y persiste. Devuelve el id del audio grabado. */
  async stopAndSave(entryId: number): Promise<{ id: number; durationS: number }> {
    if (!currentRecording) {
      throw new AppError('CONFLICT', 'No hay grabación en curso');
    }

    await currentRecording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    const uri = currentRecording.getURI();
    const status = await currentRecording.getStatusAsync();
    const durationS = Math.round((status.durationMillis ?? 0) / 1000);
    currentRecording = null;

    if (!uri) {
      throw new AppError('DB_ERROR', 'La grabación no produjo archivo');
    }

    const stamp = `${Date.now()}_${Math.round(Math.random() * 1e6)}.m4a`;
    const dest = new File(voiceDir(), stamp);
    const src = new File(uri);
    src.copy(dest);

    const db = await getDatabase();
    const now = new Date().toISOString();
    const res = await db.runAsync(
      'INSERT INTO audio_notes (entry_id, file_path, duration_s, created_at) VALUES (?, ?, ?, ?)',
      [entryId, dest.uri, durationS, now],
    );

    return { id: Number(res.lastInsertRowId), durationS };
  },

  async cancelRecording(): Promise<void> {
    if (currentRecording) {
      await currentRecording.stopAndUnloadAsync();
      currentRecording = null;
    }
  },

  async listAudios(entryId: number): Promise<Array<{ id: number; filePath: string; durationS: number | null }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; file_path: string; duration_s: number | null }>(
      'SELECT id, file_path, duration_s FROM audio_notes WHERE entry_id = ? ORDER BY created_at DESC',
      [entryId],
    );
    return rows.map((r) => ({ id: r.id, filePath: r.file_path, durationS: r.duration_s }));
  },

  async play(filePath: string): Promise<Audio.Sound> {
    const { sound } = await Audio.Sound.createAsync({ uri: filePath }, { shouldPlay: true });
    return sound;
  },

  async deleteAudio(id: number): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ file_path: string }>(
      'SELECT file_path FROM audio_notes WHERE id = ?',
      [id],
    );
    if (row) {
      await db.runAsync('DELETE FROM audio_notes WHERE id = ?', [id]);
      try {
        const f = new File(row.file_path);
        if (f.exists) f.delete();
      } catch { /* ya no existe */ }
    }
  },
};
