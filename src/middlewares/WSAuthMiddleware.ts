import { Middleware } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { MiddlewareService, type Context } from '@asenajs/hono-adapter';
import { AuthService } from '../services/AuthService';

/**
 * Authentication for the WebSocket handshake. Browsers cannot set headers on
 * an upgrade request, so the bearer token travels as a ?token= query parameter.
 * Rejection must RETURN a response — merely skipping next() does not block the
 * upgrade.
 */
@Middleware()
export class WSAuthMiddleware extends MiddlewareService {
  @Inject(AuthService)
  private authService!: AuthService;

  public async handle(context: Context, next: () => Promise<void>): Promise<void | Response> {
    const token = new URL(context.req.url).searchParams.get('token');

    if (!token) {
      return context.send({ success: false, message: 'Missing token query parameter' }, 401);
    }

    try {
      // Resolves a live user — rejects invalid/expired tokens and deleted accounts.
      const user = await this.authService.getUserFromToken(token);
      context.setWebSocketValue({ id: user.id, userName: user.userName });
    } catch {
      return context.send({ success: false, message: 'Invalid or expired token' }, 401);
    }

    await next();
  }
}
