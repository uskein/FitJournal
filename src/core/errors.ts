/**
 * Errores tipados — fuente: CONTRATOS_API.md §1.2
 * Estilo HTTP adaptado a app local. Los repositorios y services lanzan AppError;
 * la UI los traduce a Toast/EmptyState según el código.
 */

export type AppErrorCode =
  | 'VALIDATION'       // input inválido (Zod)
  | 'NOT_FOUND'        // recurso inexistente
  | 'DB_ERROR'         // error de SQLite
  | 'STORAGE_FULL'     // sin espacio en disco
  | 'PERMISSION_DENIED'// permisos de cámara/micro denegados
  | 'CONFLICT';        // estado inválido (p.ej. sesión ya activa)

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Helper para capturar errores de SQL como AppError */
export function toAppError(e: unknown, fallbackMessage = 'Error de base de datos'): AppError {
  if (e instanceof AppError) return e;
  return new AppError('DB_ERROR', fallbackMessage, e);
}
