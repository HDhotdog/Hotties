module.exports = {
  preset: 'jest-preset-angular',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  modulePaths: ['<rootDir>'],
  moduleNameMapper: {
    // The Zone.js 0.16.3 UMD bundle treats Promise.all(Set) as an empty array.
    // Use the browser bundle: RxDB awaits a Set of pending migration writes.
    '^zone\\.js$': '<rootDir>/node_modules/zone.js/fesm2015/zone.js',
    '^zone\\.js/testing$': '<rootDir>/node_modules/zone.js/fesm2015/zone-testing.js',
    '^ionicons/components/ion-icon\\.js$': '<rootDir>/node_modules/ionicons/components/ion-icon.js',
  },
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|@jsverse|@messageformat|@ionic|@stencil|ionicons|@ctrl/ngx-emoji-mart|ngx-image-compress|rxdb|rxjs|dexie|uuid)',
  ],
};
