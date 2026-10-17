import React, { useCallback, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { typeScale } from '@/theme/typography';
import { radius, shadows } from '@/theme/tokens';
import { Badge, Button, Card, Kicker, Toast } from '@/ui';
import { SketchPad, type SketchStrokes } from './SketchPad';
import { photoService } from '@/services/photoService';
import { audioService } from '@/services/audioService';
import { hapticService } from '@/services/hapticService';
import { getDatabase } from '@/core/db/database';
import type { Photo } from '@/core/types';

interface SketchItem {
  id: number;
  strokes: SketchStrokes;
}

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
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audios, setAudios] = useState<AudioRow[]>([]);
  const [sketches, setSketches] = useState<SketchItem[]>([]);
  const [editingSketch, setEditingSketch] = useState<SketchItem | null>(null);
  const [viewingSketch, setViewingSketch] = useState<SketchItem | null>(null);
  const [recording, setRecording] = useState(false);
  const [showSketch, setShowSketch] = useState(false);
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
    const sketchRows = await db.getAllAsync<{ id: number; strokes: string }>(
      'SELECT id, strokes FROM sketches WHERE entry_id = ? ORDER BY created_at DESC',
      [entryId],
    );
    setSketches(sketchRows.map(r => ({
      id: r.id,
      strokes: JSON.parse(r.strokes) as SketchStrokes,
    })));
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
    const now = new Date().toISOString();
    if (editingSketch) {
      await db.runAsync('UPDATE sketches SET strokes = ? WHERE id = ?', [JSON.stringify(strokes), editingSketch.id]);
      setEditingSketch(null);
    } else {
      await db.runAsync('INSERT INTO sketches (entry_id, strokes, created_at) VALUES (?, ?, ?)', [entryId, JSON.stringify(strokes), now]);
    }
    setShowSketch(false);
    setToast({ message: '✍️ Sketch guardado', status: 'success' });
    hapticService.success();
    await load();
  };

  const deleteSketch = async (id: number) => {
    Alert.alert('¿Borrar sketch?', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar', style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await db.runAsync('DELETE FROM sketches WHERE id = ?', [id]);
          hapticService.medium();
          setToast({ message: '🗑️ Sketch borrado', status: 'success' });
          await load();
        },
      },
    ]);
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

      {/* Sketches guardados */}
      {sketches.length > 0 && (
        <View style={{ marginTop: 8 }}>
          <Text style={[typeScale.caption, { color: theme.textMuted, marginBottom: 8 }]}>✍️ SKETCHES ({sketches.length})</Text>
          {sketches.map((sk) => (
            <View key={sk.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Pressable onPress={() => setViewingSketch(sk)} style={{ flex: 1 }}>
                <View style={{ backgroundColor: theme.field, borderRadius: radius.md, padding: 10, height: 60, overflow: 'hidden' }}>
                  <Svg width="100%" height="100%" viewBox="0 0 200 40">
                    {(sk.strokes.d ?? []).filter(d => d && d.length > 0).slice(0, 20).map((d, i) => (
                      <Path key={i} d={d} stroke={(sk.strokes.colors ?? [])[i] ?? '#2B2B2B'} strokeWidth={(sk.strokes.widths ?? [])[i] ?? 2} fill="none" strokeLinecap="round" />
                    ))}
                  </Svg>
                </View>
              </Pressable>
              <Button label="👁️" onPress={() => setViewingSketch(sk)} style={{ width: 38, height: 38, paddingHorizontal: 0 }} accessibilityLabel="Ver sketch" />
              <Button label="✏️" onPress={() => { setEditingSketch(sk); setShowSketch(true); }} style={{ width: 38, height: 38, paddingHorizontal: 0 }} accessibilityLabel="Editar sketch" />
              <Button label="🗑️" onPress={() => deleteSketch(sk.id)} style={{ width: 38, height: 38, paddingHorizontal: 0 }} accessibilityLabel="Borrar sketch" />
            </View>
          ))}
        </View>
      )}

      <Toast message={toast?.message ?? ''} status={toast?.status ?? 'success'} visible={toast !== null} onDismiss={() => setToast(null)} />

      {/* Modal sketch a pantalla completa */}
      <Modal visible={viewingSketch !== null} transparent animationType="fade" onRequestClose={() => setViewingSketch(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable onPress={() => setViewingSketch(null)} style={{ position: 'absolute', top: insets.top + 16, right: 16, zIndex: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>✕</Text>
            </View>
          </Pressable>
          {viewingSketch && (
            <View style={{ width: '90%', height: 400, backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', padding: 16 }}>
              <Svg width="100%" height="100%" viewBox="0 0 400 350">
                {(viewingSketch.strokes.d ?? []).filter(d => d && d.length > 0).map((d, i) => (
                  <Path key={i} d={d} stroke={(viewingSketch.strokes.colors ?? [])[i] ?? '#2B2B2B'} strokeWidth={(viewingSketch.strokes.widths ?? [])[i] ?? 3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </Svg>
            </View>
          )}
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 16 }}>Toca en cualquier lugar para cerrar</Text>
        </View>
      </Modal>
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
