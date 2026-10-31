import { Middleware } from '@asenajs/asena/decorators';
import { RateLimiterMiddleware } from '@asenajs/hono-adapter';
import { env } from '../env';

/**
 * Token-bucket limiter guarding the auth endpoints against brute force.
 *
 * Clients are keyed by the connecting peer address — X-Forwarded-For is only
 * believed when the peer is one of TRUSTED_PROXIES. Behind a reverse proxy,
 * list it there; otherwise every client shares the proxy's single bucket.
 * The constructor runs before injection, so options come from env, not @Value.
 */
@Middleware()
export class AuthRateLimiter extends RateLimiterMiddleware {
  constructor() {
    super({
      capacity: 20,
      refillRate: 20 / 60,
      trustProxy: env.trustedProxies.length > 0 ? [...env.trustedProxies] : false,
      message: 'Too many auth attempts, please try again later.',
    });
  }
}
