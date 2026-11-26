const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]'];

/**
 * The real-Postgres suite drops the whole schema, so it must never run on a database that
 * could hold real data. All of these must hold: the name ends in _test, the host is this
 * machine (or ALLOW_REMOTE_TEST_DB=1 says otherwise on purpose), and the URL has no query
 * string (which could override the host).
 */
export function assertSafeTestDatabase(url: string, env: NodeJS.ProcessEnv = process.env): void {
  const parsed = new URL(url);
  if (!parsed.pathname.slice(1).endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name ends in _test');
  }
  if (parsed.search) {
    throw new Error('TEST_DATABASE_URL must not have a query string');
  }
  if (!LOCAL_HOSTS.includes(parsed.hostname) && env.ALLOW_REMOTE_TEST_DB !== '1') {
    throw new Error('TEST_DATABASE_URL must use a local host, or set ALLOW_REMOTE_TEST_DB=1');
  }
}
