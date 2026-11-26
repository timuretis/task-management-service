import { assertSafeTestDatabase } from './assert-safe-test-database';

describe('assertSafeTestDatabase', () => {
  it.each([
    'postgres://tasks:tasks@127.0.0.1:5432/tasks_test',
    'postgres://tasks:tasks@localhost/tasks_test',
    'postgres://tasks:tasks@[::1]:5432/tasks_test',
  ])('accepts a local test database: %s', (url) => {
    expect(() => assertSafeTestDatabase(url, {})).not.toThrow();
  });

  it('rejects a database whose name does not end in _test', () => {
    expect(() => assertSafeTestDatabase('postgres://tasks:tasks@127.0.0.1/tasks', {})).toThrow(
      '_test',
    );
  });

  it('rejects a query string, which could override the host', () => {
    const url = 'postgres://tasks:tasks@127.0.0.1/tasks_test?host=prod.example.com';

    expect(() => assertSafeTestDatabase(url, {})).toThrow('query string');
  });

  it('rejects a remote host unless it is allowed on purpose', () => {
    const url = 'postgres://tasks:tasks@db.example.com/tasks_test';

    expect(() => assertSafeTestDatabase(url, {})).toThrow('local host');
    expect(() => assertSafeTestDatabase(url, { ALLOW_REMOTE_TEST_DB: '1' })).not.toThrow();
  });
});
