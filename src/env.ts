/**
 * Module-level configuration. Only values needed before the IoC container
 * exists live here: the listen port, decorator options (@Database, @Auth) and
 * middleware constructor options (CORS, rate limiter). Component configuration
 * that can wait for the container is injected with @Value instead.
 */
const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const env = {
  port: Number(process.env['PORT'] ?? 3000),
  /** Reverse-proxy addresses whose X-Forwarded-For the rate limiter may believe. */
  trustedProxies: list(process.env['TRUSTED_PROXIES']),
  /**
   * Browser origins allowed to call the API with credentials. Feeds both the
   * CORS policy and the session cookie's cross-site check, so a frontend that
   * may send the cookie is also one whose state-changing requests keep it.
   */
  allowedOrigins: list(process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000,http://localhost:5173'),
  /** Session lifetime in seconds (sliding); defaults to 12 hours. */
  sessionTtl: Number(process.env['SESSION_TTL'] ?? 60 * 60 * 12),
  database: {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    database: process.env['DB_NAME'] ?? 'asena_example',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? 'postgres',
  },
} as const;
