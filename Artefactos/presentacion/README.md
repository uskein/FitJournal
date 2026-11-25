# DiarioFit — presentación de producto

Dos entregables construidos con las skills de HyperFrames a partir de la app real (APK v1.1.0, datos sembrados en el emulador).

## 1. Película de lanzamiento — `film/`

HyperFrames, 1920×1080 @ 30 fps, **36 s**, storyline A *"Un día cualquiera"* (alternativas en `film/STORYLINES.md`, guion numérico en `film/SPEC.md`, revisión en `film/REVIEW.md`).

```bash
cd film
npm run check                                   # 0 errores
node <SKILLS>/hyperframes/scripts/plugin-cli.mjs snapshot --at 1,8,13,24,31,35
npm run render
```

Resultado: `film/renders/film_2026-11-25_13-21-53.mp4` (7,0 MB · 36,0 s · 1920×1080 · 30 fps · H.264).

**Audio:** se entrega **sin música**. `hyperframes auth status` devolvió *"Not signed in to HeyGen"* y la skill prescribe entregar en silencio antes que inventar una pista. Para añadirla: `npx hyperframes auth login`, generar el bed con `/media-use` y `<audio src="assets/bgm.mp3" data-start="0" data-duration="36" data-volume="…">` en `film/index.html`; luego `npm run check && npm run render`.

## 2. Deck navegable — `deck/`

Slideshow de 10 diapositivas + una rama (*Las personas*), con fragmentos, hotspot, notas de presentador, navegación y modo audiencia. **No se renderiza a MP4**.

```bash
cd deck
npm run check
node <SKILLS>/hyperframes/scripts/plugin-cli.mjs present . --no-open --port 3004
```

Abrir `http://localhost:3004`, pulsar **Present** (o `P`) y compartir la pestaña de audiencia.

## Fuentes de verdad

- `screenshots/`: 9 capturas verificadas del APK instalado en el emulador (`seed-01…08` + validación final 1.1.0).
- `film/assets/screens/` y `deck/{,composition/}assets/screens/`: copias usadas por cada proyecto.
- `Artefactos/documentacion/Diseño Visual/manual-identidad-visual.md`: paleta, tipografía y sombra clay.
- `Artefactos/documentacion/Producto y Flujos/REQUERIMIENTOS_FUNCIONALES.md`: copy y personas.
- `seed-emulator-db.mjs`, `push-db.mjs`, `pull-db.mjs`, `shot.mjs`: tooling para sembrar la BD y capturar pantallas.

Los datos sembrados se conservan tras reinstalar el APK limpio (misma firma debug.keystore, versionCode 2).
