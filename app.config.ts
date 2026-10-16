import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'FitJournal',
  slug: 'fitjournal',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'fitjournal',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.fitjournal.app',
    infoPlist: {
      NSCameraUsageDescription:
        'FitJournal usa la cámara para que registres fotos de tu progreso y de tu día. Las fotos nunca salen de tu dispositivo.',
      NSPhotoLibraryUsageDescription:
        'FitJournal accede a tu galería para adjuntar fotos a tus entradas y sesiones. Todo se guarda localmente.',
      NSMicrophoneUsageDescription:
        'FitJournal usa el micrófono para grabar notas de voz en tu diario. Los audios se guardan solo en tu dispositivo.',
    },
  },
  android: {
    package: 'com.fitjournal.app',
    permissions: ['CAMERA', 'RECORD_AUDIO', 'USE_BIOMETRIC'],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-sqlite',
    [
      'expo-image-picker',
      {
        photosPermission:
          'Para adjuntar fotos a tu diario y tus sesiones (se guardan localmente).',
        cameraPermission:
          'Para tomar fotos de tu progreso (se guardan localmente).',
      },
    ],
    'expo-local-authentication',
  ],
  extra: {
    router: { origin: false },
  },
};

export default config;
