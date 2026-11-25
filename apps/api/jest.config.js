/** Unit tests live next to the code as *.spec.ts; e2e tests are in test/.
 * main.ts and app.setup.ts are bootstrap wiring, covered by the e2e tests instead. */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  collectCoverageFrom: ['**/*.ts', '!main.ts', '!app.setup.ts', '!**/*.spec.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: { statements: 80, branches: 80, functions: 80, lines: 80 },
  },
};
