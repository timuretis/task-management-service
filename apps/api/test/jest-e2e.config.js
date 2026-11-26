module.exports = {
  rootDir: '.',
  testRegex: '.*\\.(e2e|pg)-spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
};
