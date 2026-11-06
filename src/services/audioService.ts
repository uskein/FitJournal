import { Directory, File, Paths } from 'expo-file-system';
import { AppError } from '@/core/errors';
import { getDatabase } from '@/core/db/database';
import type { AudioPlayer, AudioRecorder } from 'expo-audio';

/**
 * audioService — HU-09 (notas de voz)
 * Implementación real con expo-audio (instalado en el APK de producción).
 * Si el módulo nativo no está disponible (p. ej. un entorno sin soporte),
 * se lanza AppError con el mensaje amigable de siempre.
 */

const AUDIOS_DIR_NAME = 'audios';

let recorder: AudioRecorder | null = null;
let player: AudioPlayer | null = null;

function audiosDir(): Directory {
  const dir = new Directory(Paths.document, AUDIOS_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function loadAudio() {
  try {
    return await import('expo-audio');
  } catch {
    throw new AppError('PERMISSION_DENIED', 'Notas de voz disponibles solo en build de producción');
  }
}

export const audioService = {
  async startRecording(): Promise<void> {
    if (recorder?.isRecording) {
      throw new AppError('CONFLICT', 'Ya hay una grabación en curso');
    }
    const { AudioModule, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } =
      await loadAudio();
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        throw new AppError('PERMISSION_DENIED', 'Permiso de micrófono denegado. Actívalo en Ajustes.');
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const r = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
      await r.prepareToRecordAsync();
      r.record();
      recorder = r;
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError('PERMISSION_DENIED', 'Notas de voz disponibles solo en build de producción');
    }
  },

  async stopAndSave(entryId: number): Promise<{ id: number; durationS: number }> {
    const r = recorder;
    if (!r) throw new AppError('CONFLICT', 'No hay grabación en curso');
    try {
      const durationS = Math.max(0, Math.round(r.currentTime ?? 0));
      await r.stop();
      const uri = r.uri;
      recorder = null;
      if (!uri) throw new AppError('DB_ERROR', 'La grabación no produjo archivo');

      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dest = new File(audiosDir(), `${stamp}.m4a`);
      new File(uri).copy(dest);

      const db = await getDatabase();
      const result = await db.runAsync(
        'INSERT INTO audio_notes (entry_id, file_path, duration_s, created_at) VALUES (?, ?, ?, ?)',
        [entryId, dest.uri, durationS, new Date().toISOString()],
      );
      return { id: Number(result.lastInsertRowId), durationS };
    } catch (e) {
      recorder = null;
      if (e instanceof AppError) throw e;
      throw new AppError('DB_ERROR', 'No se pudo guardar la nota de voz', e);
    }
  },

  async cancelRecording(): Promise<void> {
    const r = recorder;
    recorder = null;
    if (r) {
      try {
        await r.stop();
      } catch {
        /* ya detenida */
      }
    }
  },

  /** Segundos transcurridos de la grabación en curso (indicador de tiempo) */
  getElapsedSeconds(): number {
    return recorder ? Math.max(0, Math.round(recorder.currentTime ?? 0)) : 0;
  },

  async listAudios(
    entryId: number,
  ): Promise<Array<{ id: number; filePath: string; durationS: number | null }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ id: number; file_path: string; duration_s: number | null }>(
      'SELECT id, file_path, duration_s FROM audio_notes WHERE entry_id = ? ORDER BY created_at DESC',
      [entryId],
    );
    return rows.map((r) => ({ id: r.id, filePath: r.file_path, durationS: r.duration_s }));
  },

  async play(filePath: string): Promise<void> {
    const { createAudioPlayer } = await loadAudio();
    try {
      player?.remove();
      const p = createAudioPlayer({ uri: filePath });
      player = p;
      p.play();
    } catch (e) {
      throw new AppError('NOT_FOUND', 'No se pudo reproducir el audio', e);
    }
  },

  async deleteAudio(id: number, filePath?: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM audio_notes WHERE id = ?', [id]);
    if (filePath) {
      try {
        new File(filePath).delete();
      } catch {
        /* archivo ya borrado */
      }
    }
  },
};
