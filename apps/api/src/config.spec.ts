import { loadConfig } from './config';

const DATABASE_URL = 'postgres://app:secret@localhost:5432/tasks';

describe('loadConfig', () => {
  it('uses development defaults when only DATABASE_URL is set', () => {
    expect(loadConfig({ DATABASE_URL })).toEqual({
      port: 3000,
      nodeEnv: 'development',
      corsOrigins: ['http://localhost:5173'],
      databaseUrl: DATABASE_URL,
      trustProxy: 0,
    });
  });

  it('reads valid values and splits several origins', () => {
    const config = loadConfig({
      PORT: '8080',
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.example.com, http://localhost:5173/',
      DATABASE_URL: 'postgresql://app:secret@db:5432/tasks',
    });
    expect(config).toEqual({
      port: 8080,
      nodeEnv: 'production',
      corsOrigins: ['https://app.example.com', 'http://localhost:5173'],
      databaseUrl: 'postgresql://app:secret@db:5432/tasks',
      trustProxy: 0,
    });
  });

  it.each(['abc', '0', '70000', '3.5', '3e3', '0x10'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ DATABASE_URL, PORT: port })).toThrow('PORT');
  });

  describe('TRUST_PROXY', () => {
    it('is off when unset or empty', () => {
      expect(loadConfig({ DATABASE_URL }).trustProxy).toBe(0);
      expect(loadConfig({ DATABASE_URL, TRUST_PROXY: '' }).trustProxy).toBe(0);
    });

    it('reads the number of proxy hops', () => {
      expect(loadConfig({ DATABASE_URL, TRUST_PROXY: '1' }).trustProxy).toBe(1);
    });

    it.each(['true', '-1', '1.5', '1e1', '6', 'loopback'])('rejects TRUST_PROXY=%s', (value) => {
      expect(() => loadConfig({ DATABASE_URL, TRUST_PROXY: value })).toThrow('TRUST_PROXY');
    });
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadConfig({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow('NODE_ENV');
  });

  it('rejects an invalid CORS origin', () => {
    expect(() => loadConfig({ DATABASE_URL, CORS_ORIGIN: 'not a url' })).toThrow('CORS_ORIGIN');
  });

  it('requires CORS_ORIGIN in production', () => {
    expect(() => loadConfig({ DATABASE_URL, NODE_ENV: 'production' })).toThrow(
      'required in production',
    );
  });

  describe('DATABASE_URL', () => {
    it('is required', () => {
      expect(() => loadConfig({})).toThrow('DATABASE_URL is required');
    });

    it('must be a URL', () => {
      expect(() => loadConfig({ DATABASE_URL: 'not a url' })).toThrow('not a valid URL');
    });

    it('must use a postgres scheme', () => {
      expect(() => loadConfig({ DATABASE_URL: 'mysql://app:secret@localhost/tasks' })).toThrow(
        'postgres://',
      );
    });

    it('never puts the password in an error message', () => {
      expect(() => loadConfig({ DATABASE_URL: 'mysql://app:hunter2@localhost/tasks' })).toThrow(
        expect.not.objectContaining({ message: expect.stringContaining('hunter2') }),
      );
    });
  });
});
