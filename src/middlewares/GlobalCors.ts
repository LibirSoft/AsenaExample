import { Middleware } from '@asenajs/asena/decorators';
import { CorsMiddleware } from '@asenajs/hono-adapter';
import { env } from '../env';

/**
 * Adapter built-ins are undecorated base classes — they must be subclassed
 * with @Middleware() before they can be attached anywhere.
 *
 * The origin list is shared with AppAuth's cross-site check (ALLOWED_ORIGINS),
 * so every origin allowed to send the session cookie here also keeps it on
 * state-changing requests. The constructor runs before injection, so options
 * come from env, not @Value.
 */
@Middleware()
export class GlobalCors extends CorsMiddleware {
  constructor() {
    super({
      origin: [...env.allowedOrigins],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
  }
}
