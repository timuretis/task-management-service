import { loadConfig } from './config';

describe('loadConfig', () => {
  it('uses development defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      nodeEnv: 'development',
      corsOrigins: ['http://localhost:5173'],
    });
  });

  it('reads valid values and splits several origins', () => {
    const config = loadConfig({
      PORT: '8080',
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://app.example.com, http://localhost:5173/',
    });
    expect(config).toEqual({
      port: 8080,
      nodeEnv: 'production',
      corsOrigins: ['https://app.example.com', 'http://localhost:5173'],
    });
  });

  it.each(['abc', '0', '70000', '3.5', '3e3', '0x10'])('rejects PORT=%s', (port) => {
    expect(() => loadConfig({ PORT: port })).toThrow('PORT');
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow('NODE_ENV');
  });

  it('rejects an invalid CORS origin', () => {
    expect(() => loadConfig({ CORS_ORIGIN: 'not a url' })).toThrow('CORS_ORIGIN');
  });

  it('requires CORS_ORIGIN in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow('required in production');
  });
});
