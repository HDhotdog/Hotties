module.exports = {
  preset: 'jest-preset-angular',
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^ionicons/components/ion-icon\\.js$': '<rootDir>/node_modules/ionicons/components/ion-icon.js',
  },
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/.model-cache/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic|@stencil|ionicons|@ctrl/ngx-emoji-mart|ngx-image-compress|rxdb|rxjs|dexie|uuid)',
  ],
};
