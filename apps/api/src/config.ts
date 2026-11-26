export type NodeEnv = 'development' | 'production' | 'test';

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  corsOrigins: string[];
  databaseUrl: string;
}

const NODE_ENVS: NodeEnv[] = ['development', 'production', 'test'];
// Vite's default dev server; only used outside production.
const DEV_CORS_ORIGIN = 'http://localhost:5173';

function parsePort(value: string | undefined): number {
  const port = Number(value ?? 3000);
  // Number() alone would accept forms like "3e3" or "0x10".
  if (!/^\d+$/.test(value ?? '3000') || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${value}"`);
  }
  return port;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  const nodeEnv = value ?? 'development';
  if (!NODE_ENVS.includes(nodeEnv as NodeEnv)) {
    throw new Error(`NODE_ENV must be one of ${NODE_ENVS.join(', ')}, got "${value}"`);
  }
  return nodeEnv as NodeEnv;
}

function parseOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    throw new Error(`CORS_ORIGIN has an invalid origin: "${origin}"`);
  }
}

// Production must name its web origin explicitly: a silent default would hide a misconfiguration.
function parseCorsOrigins(value: string | undefined, nodeEnv: NodeEnv): string[] {
  if (!value) {
    if (nodeEnv === 'production') throw new Error('CORS_ORIGIN is required in production');
    return [DEV_CORS_ORIGIN];
  }
  return value.split(',').map((origin) => parseOrigin(origin.trim()));
}

// The URL holds the password, so no error below repeats its value.
function parseDatabaseUrl(value: string | undefined): string {
  if (!value) throw new Error('DATABASE_URL is required');
  let protocol: string;
  try {
    protocol = new URL(value).protocol;
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }
  if (protocol !== 'postgres:' && protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
  }
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  return {
    port: parsePort(env.PORT),
    nodeEnv,
    corsOrigins: parseCorsOrigins(env.CORS_ORIGIN, nodeEnv),
    databaseUrl: parseDatabaseUrl(env.DATABASE_URL),
  };
}
