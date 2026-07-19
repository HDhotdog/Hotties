module.exports = {
  preset: 'jest-preset-angular',
  modulePaths: ['<rootDir>'],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@ionic|@stencil|ionicons|@ctrl/ngx-emoji-mart|ngx-image-compress|rxdb|rxjs|dexie)',
  ],
};
