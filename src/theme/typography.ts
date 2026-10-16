/**
 * Tipografía — FitJournal
 * Fuente de verdad: manual-identidad-visual.md §2.7
 * Fraunces (títulos) · Nunito Sans (cuerpo/UI) · JetBrains Mono (datos/PRs)
 *
 * Las fuentes se cargan en app/_layout.tsx con @expo-google-fonts.
 * Regla de fusión: TODO número de gimnasio (peso, reps, PR, racha) en JetBrains Mono.
 */

export const fonts = {
  /** Display y títulos (alma de cuaderno) */
  displayBold: 'Fraunces_700Bold',
  displaySemi: 'Fraunces_600SemiBold',

  /** Cuerpo, UI, botones */
  bodyRegular: 'NunitoSans_400Regular',
  bodySemi: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',

  /** Datos — pesos, PRs, rachas (alma editorial) */
  dataMedium: 'JetBrainsMono_500Medium',
  dataBold: 'JetBrainsMono_700Bold',
} as const;

export const typeScale = {
  display: { fontFamily: fonts.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.displaySemi, fontSize: 28, lineHeight: 34 },
  h2: { fontFamily: fonts.displaySemi, fontSize: 23, lineHeight: 29 },
  h3: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 25 },
  body: { fontFamily: fonts.bodyRegular, fontSize: 16, lineHeight: 24 },
  bodySm: { fontFamily: fonts.bodyRegular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.bodySemi, fontSize: 12.5, lineHeight: 17 },
  button: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 20 },

  /** Kicker editorial — SECCIÓN EN MAYÚSCULAS con tracking */
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase' as const,
  },

  /** Datos pequeños (pesos en listas, stats) */
  dataSm: { fontFamily: fonts.dataMedium, fontSize: 14, lineHeight: 18 },
  dataMd: { fontFamily: fonts.dataBold, fontSize: 20, lineHeight: 24 },

  /** Datos grandes — PRs y récords (titulares editoriales) */
  dataLg: { fontFamily: fonts.dataBold, fontSize: 34, lineHeight: 38 },
  dataXl: { fontFamily: fonts.dataBold, fontSize: 48, lineHeight: 52 },
} as const;

export type TypeScale = typeof typeScale;
