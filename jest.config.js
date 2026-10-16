module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/src/core/db/__tests__/expo-sqlite-mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)',
  ],
};
