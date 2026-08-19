import { Middleware } from '@asenajs/asena/decorators';
import { RateLimiterMiddleware } from '@asenajs/hono-adapter';

/** Token-bucket limiter guarding the auth endpoints against brute force. */
@Middleware()
export class AuthRateLimiter extends RateLimiterMiddleware {
  constructor() {
    super({
      capacity: 20,
      refillRate: 20 / 60,
      message: 'Too many auth attempts, please try again later.',
    });
  }
}
