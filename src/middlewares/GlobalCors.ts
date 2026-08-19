import { Middleware } from '@asenajs/asena/decorators';
import { CorsMiddleware } from '@asenajs/hono-adapter';

/**
 * Adapter built-ins are undecorated base classes — they must be subclassed
 * with @Middleware() before they can be attached anywhere.
 */
@Middleware()
export class GlobalCors extends CorsMiddleware {
  constructor() {
    super({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
  }
}
