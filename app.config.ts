import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'DiarioFit',
  slug: 'diariofit',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'diariofit',
  userInterfaceStyle: 'automatic',
  icon: './assets/icon.png',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.diariofit.app',
    infoPlist: {
      NSCameraUsageDescription:
        'DiarioFit usa la cámara para que registres fotos de tu progreso y de tu día. Las fotos nunca salen de tu dispositivo.',
      NSPhotoLibraryUsageDescription:
        'DiarioFit accede a tu galería para adjuntar fotos a tus entradas y sesiones. Todo se guarda localmente.',
      NSMicrophoneUsageDescription:
        'DiarioFit usa el micrófono para grabar notas de voz en tu diario. Los audios se guardan solo en tu dispositivo.',
    },
  },
  android: {
    package: 'com.diariofit.app',
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
