import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, Card, Kicker, Toast } from '@/ui';
import { SketchPad, type SketchStrokes } from './SketchPad';
import { photoService } from '@/services/photoService';
import { audioService } from '@/services/audioService';
import { hapticService } from '@/services/hapticService';
import { getDatabase } from '@/core/db/database';
import type { Photo } from '@/core/types';

/**
 * MultimediaSection — HU-09 (voz) · HU-15 (sketch) · fotos
 * Tira multimedia de la entrada del día: galería, grabación, lienzo.
 */

interface AudioRow {
  id: number;
  filePath: string;
  durationS: number | null;
}

interface MultimediaSectionProps {
  entryId: number | null;
}

export function MultimediaSection({ entryId }: MultimediaSectionProps) {
  const theme = useTheme();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [recording, setRecording] = useState(false);
  const [showSketch, setShowSketch] = useState(false);
  const [sketches, setSketches] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; status: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    if (!entryId) return;
    const [p, a] = await Promise.all([
      photoService.listPhotos('diary', entryId),
      audioService.listAudios(),
    ]);
    setPhotos(p);
    setAudios(a);
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM sketches WHERE entry_id = ?',
      [entryId],
    );
    setSketches(row?.n ?? 0);
  }, [entryId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const addPhoto = async (from: 'camera' | 'library') => {
    if (!entryId) return;
    try {
      if (from === 'camera') await photoService.takePhoto('diary', entryId);
      else await photoService.pickPhoto('diary', entryId);
      await load();
    } catch (e) {
      const msg = e instanceof Error && 'code' in e && e.code === 'PERMISSION_DENIED'
        ? (e as Error).message
        : 'No se pudo añadir la foto';
      setToast({ message: msg, status: 'error' });
    }
  };

  const toggleRecording = async () => {
    if (!entryId) return;
    try {
      if (recording) {
        await audioService.stopAndSave();
        setRecording(false);
        setToast({ message: '🎙️ Nota guardada', status: 'success' });
        await load();
      } else {
        await audioService.startRecording();
        setRecording(true);
      }
    } catch (e) {
      setRecording(false);
      const msg = e instanceof Error && 'code' in e && e.code === 'PERMISSION_DENIED'
        ? (e as Error).message
        : 'No se pudo grabar';
      setToast({ message: msg, status: 'error' });
    }
  };

  const saveSketch = async (strokes: SketchStrokes) => {
    if (!entryId) return;
    const db = await getDatabase();
    await db.runAsync('INSERT INTO sketches (entry_id, strokes, created_at) VALUES (?, ?, ?)', [
      entryId,
      JSON.stringify(strokes),
      new Date().toISOString(),
    ]);
    setShowSketch(false);
    setToast({ message: '✍️ Sketch guardado', status: 'success' });
    await load();
  };

  const deletePhoto = async (id: number) => {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ file_path: string }>('SELECT file_path FROM photos WHERE id = ?', [id]);
      await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
      if (row) {
        try { const { File } = await import('expo-file-system'); const f = new File(row.file_path); if (f.exists) f.delete(); } catch { /* ya no existe */ }
      }
      hapticService.light();
      setToast({ message: '🗑️ Foto borrada', status: 'success' });
      load();
    } catch { setToast({ message: 'No se pudo borrar', status: 'error' }); }
  };

  const deleteAudio = async (id: number) => {
    try {
      const db = await getDatabase();
      const row = await db.getFirstAsync<{ file_path: string }>('SELECT file_path FROM audio_notes WHERE id = ?', [id]);
      await db.runAsync('DELETE FROM audio_notes WHERE id = ?', [id]);
      if (row) {
        try { const { File } = await import('expo-file-system'); const f = new File(row.file_path); if (f.exists) f.delete(); } catch { /* ya no existe */ }
      }
      hapticService.light();
      setToast({ message: '🗑️ Audio borrado', status: 'success' });
      load();
    } catch { setToast({ message: 'No se pudo borrar', status: 'error' }); }
  };

  if (!entryId) return null;

  if (showSketch) {
    return (
      <Card style={{ marginBottom: 14 }}>
        <Kicker style={{ marginBottom: 12 }}>SKETCH</Kicker>
        <SketchPad onSave={saveSketch} onCancel={() => setShowSketch(false)} />
        <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
      </Card>
    );
  }

  return (
    <Card style={{ marginBottom: 14 }}>
      <Kicker style={{ marginBottom: 12 }}>MULTIMEDIA</Kicker>

      {/* Acciones */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tomar foto"
          onPress={() => addPhoto('camera')}
          style={[styles.action, { backgroundColor: theme.primarySoft }]}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={[typeScale.caption, { color: theme.primary }]}>Foto</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Elegir de galería"
          onPress={() => addPhoto('library')}
          style={[styles.action, { backgroundColor: theme.primarySoft }]}
        >
          <Text style={styles.actionIcon}>🖼️</Text>
          <Text style={[typeScale.caption, { color: theme.primary }]}>Galería</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Detener grabación' : 'Grabar nota de voz'}
          onPress={toggleRecording}
          style={[styles.action, { backgroundColor: recording ? theme.error : theme.secondarySoft }]}
        >
          <Text style={styles.actionIcon}>{recording ? '⏹️' : '🎙️'}</Text>
          <Text style={[typeScale.caption, { color: recording ? '#fff' : '#8F4E33' }]}>
            {recording ? 'Grabando' : 'Voz'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dibujar sketch"
          onPress={() => setShowSketch(true)}
          style={[styles.action, { backgroundColor: theme.primarySoft }]}
        >
          <Text style={styles.actionIcon}>✍️</Text>
          <Text style={[typeScale.caption, { color: theme.primary }]}>Sketch</Text>
        </Pressable>
      </View>

      {/* Galería con borrado */}
      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {photos.map((p) => (
              <View key={p.id} style={{ position: 'relative' }}>
                <Image source={{ uri: p.thumbPath ?? p.filePath }} style={[styles.thumb, shadows.clay]} accessibilityLabel="Foto de la entrada" />
                <Pressable onPress={() => deletePhoto(p.id)} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: theme.error, borderRadius: 999, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Borrar foto">
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Audios con borrado */}
      {audios.map((a) => (
        <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Pressable
            onPress={() => audioService.play()}
            style={[styles.audioRow, { backgroundColor: theme.field, flex: 1 }]}
            accessibilityRole="button"
            accessibilityLabel={`Reproducir nota de ${a.durationS ?? 0} segundos`}
          >
            <Text style={{ fontSize: 16 }}>▶️</Text>
            <Text style={[typeScale.bodySm, { color: theme.text, flex: 1 }]}>Nota de voz</Text>
            <Badge variant="habit">{`${a.durationS ?? 0}s`}</Badge>
          </Pressable>
          <Pressable onPress={() => deleteAudio(a.id)} style={{ backgroundColor: theme.error, borderRadius: 999, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Borrar audio">
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✕</Text>
          </Pressable>
        </View>
      ))}

      {sketches > 0 && (
        <Badge variant="tag">{`${sketches} sketch(es) guardados`}</Badge>
      )}

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />
    </Card>
  );
}

const styles = {
  action: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 12,
    borderRadius: radius.lg,
    gap: 4,
  },
  actionIcon: { fontSize: 22 },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
  },
  audioRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
  },
};
