module.exports = {
  preset: 'jest-preset-angular',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    '^ionicons/components/ion-icon\\.js$': '<rootDir>/node_modules/ionicons/components/ion-icon.js',
  },
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@jsverse|@messageformat|@ionic|@stencil|ionicons|@ctrl/ngx-emoji-mart|ngx-image-compress|rxdb|rxjs|dexie|uuid)',
  ],
};
