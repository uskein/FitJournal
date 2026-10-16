import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import { AppError } from '@/core/errors';
import { photoRepository } from '@/core/repositories/photoRepository';
import type { Photo } from '@/core/types';

/**
 * photoService — PLAN_DE_SPRINTS §5.1 · ADR-004
 * Captura (cámara o galería) → compresión JPEG ~70% → thumbnail 300px →
 * archivos en FileSystem + metadatos en SQLite. Nunca BLOB en la DB.
 */

const PHOTOS_DIR_NAME = 'photos';

function photosDir(): Directory {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

async function ensurePermission(
  kind: 'camera' | 'library',
): Promise<void> {
  const perm =
    kind === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new AppError(
      'PERMISSION_DENIED',
      kind === 'camera'
        ? 'Permiso de cámara denegado. Actívalo en Ajustes del sistema.'
        : 'Permiso de galería denegado. Actívalo en Ajustes del sistema.',
    );
  }
}

async function saveProcessed(
  uri: string,
): Promise<{ filePath: string; thumbPath: string; width: number; height: number }> {
  // Compresión principal ~70% (presupuesto de rendimiento, Skill 2 Paso 1)
  const main = await manipulateAsync(uri, [], { compress: 0.7, format: SaveFormat.JPEG });
  // Thumbnail 300px para listas
  const thumb = await manipulateAsync(
    uri,
    [{ resize: { width: 300 } }],
    { compress: 0.6, format: SaveFormat.JPEG },
  );

  const stamp = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
  const mainFile = new File(photosDir(), `${stamp}.jpg`);
  const thumbFile = new File(photosDir(), `${stamp}_thumb.jpg`);

  const src = new File(main.uri);
  src.copy(mainFile);
  const srcThumb = new File(thumb.uri);
  srcThumb.copy(thumbFile);

  return {
    filePath: mainFile.uri,
    thumbPath: thumbFile.uri,
    width: main.width,
    height: main.height,
  };
}

export const photoService = {
  /** Captura desde la cámara */
  async takePhoto(
    owner: 'diary' | 'session',
    ownerId: number,
  ): Promise<Photo> {
    await ensurePermission('camera');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) {
      throw new AppError('VALIDATION', 'Captura cancelada');
    }
    return photoService.addFromUri(owner, ownerId, result.assets[0].uri);
  },

  /** Selecciona desde la galería (una imagen) */
  async pickPhoto(
    owner: 'diary' | 'session',
    ownerId: number,
  ): Promise<Photo> {
    await ensurePermission('library');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) {
      throw new AppError('VALIDATION', 'Selección cancelada');
    }
    return photoService.addFromUri(owner, ownerId, result.assets[0].uri);
  },

  /** Procesa cualquier URI y la asocia al dueño */
  async addFromUri(owner: 'diary' | 'session', ownerId: number, uri: string): Promise<Photo> {
    try {
      const saved = await saveProcessed(uri);
      return await photoRepository.addPhoto(owner, ownerId, saved);
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError('STORAGE_FULL', 'No se pudo guardar la foto (¿espacio lleno?)', e);
    }
  },

  async listPhotos(owner: 'diary' | 'session', ownerId: number): Promise<Photo[]> {
    return photoRepository.getPhotosOfOwner(owner, ownerId);
  },

  /** Borra archivo + fila (M10: sin huérfanos) */
  async deletePhoto(id: number): Promise<void> {
    const removed = await photoRepository.deletePhoto(id);
    if (removed) {
      try {
        const f = new File(removed.filePath);
        if (f.exists) f.delete();
        const t = removed.thumbPath ? new File(removed.thumbPath) : null;
        if (t?.exists) t.delete();
      } catch { /* el archivo puede no existir ya */ }
    }
  },
};
