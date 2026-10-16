import { getDatabase } from '@/core/db/database';
import { AppError } from '@/core/errors';
import type { Photo } from '@/core/types';
import { z } from 'zod';

/**
 * photoRepository — fuente: CONTRATOS_API.md §5 · ADR-004 (filesystem, no BLOB)
 * Solo guarda METADATOS y rutas; el binario vive en FileSystem.
 * Borrar dueño ⇒ borrar archivos + filas (limpieza de huérfanos, M10).
 */

const ownerSchema = z.enum(['diary', 'session']);
const photoPathSchema = z.string().min(1).max(1000);

interface PhotoRow {
  id: number;
  owner_type: 'diary' | 'session';
  owner_id: number;
  file_path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

function toPhoto(r: PhotoRow): Photo {
  return {
    id: r.id,
    ownerType: r.owner_type,
    ownerId: r.owner_id,
    filePath: r.file_path,
    thumbPath: r.thumb_path,
    width: r.width,
    height: r.height,
    createdAt: r.created_at,
  };
}

export interface AddPhotoInput {
  filePath: string;
  thumbPath?: string | null;
  width?: number | null;
  height?: number | null;
}

export const photoRepository = {
  async addPhoto(owner: 'diary' | 'session', ownerId: number, input: AddPhotoInput): Promise<Photo> {
    ownerSchema.parse(owner);
    photoPathSchema.parse(input.filePath);
    const db = await getDatabase();
    const now = new Date().toISOString();
    const res = await db.runAsync(
      `INSERT INTO photos (owner_type, owner_id, file_path, thumb_path, width, height, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [owner, ownerId, input.filePath, input.thumbPath ?? null, input.width ?? null, input.height ?? null, now],
    );
    return {
      id: Number(res.lastInsertRowId),
      ownerType: owner,
      ownerId,
      filePath: input.filePath,
      thumbPath: input.thumbPath ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      createdAt: now,
    };
  },

  async getPhotosOfOwner(owner: 'diary' | 'session', ownerId: number): Promise<Photo[]> {
    ownerSchema.parse(owner);
    const db = await getDatabase();
    const rows = await db.getAllAsync<PhotoRow>(
      'SELECT * FROM photos WHERE owner_type = ? AND owner_id = ? ORDER BY created_at DESC',
      [owner, ownerId],
    );
    return rows.map(toPhoto);
  },

  async getPhotoById(id: number): Promise<Photo | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', [id]);
    return row ? toPhoto(row) : null;
  },

  /** Devuelve las rutas de archivos borrados para que el service los elimine del disco */
  async deletePhoto(id: number): Promise<{ filePath: string; thumbPath: string | null } | null> {
    const photo = await this.getPhotoById(id);
    if (!photo) return null;
    const db = await getDatabase();
    await db.runAsync('DELETE FROM photos WHERE id = ?', [id]);
    return { filePath: photo.filePath, thumbPath: photo.thumbPath };
  },

  /** Devuelve las rutas de archivos borrados para que el service los elimine del disco */
  async deletePhotosOfOwner(
    owner: 'diary' | 'session',
    ownerId: number,
  ): Promise<Array<{ filePath: string; thumbPath: string | null }>> {
    ownerSchema.parse(owner);
    const photos = await this.getPhotosOfOwner(owner, ownerId);
    if (photos.length === 0) return [];
    const db = await getDatabase();
    await db.runAsync('DELETE FROM photos WHERE owner_type = ? AND owner_id = ?', [owner, ownerId]);
    return photos.map((p) => ({ filePath: p.filePath, thumbPath: p.thumbPath }));
  },
};
