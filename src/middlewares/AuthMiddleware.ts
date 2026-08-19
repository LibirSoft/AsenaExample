import { Middleware } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { MiddlewareService, type Context } from '@asenajs/hono-adapter';
import { AuthService } from '../services/AuthService';

@Middleware()
export class AuthMiddleware extends MiddlewareService {
  @Inject(AuthService)
  private authService!: AuthService;

  public async handle(context: Context, next: () => Promise<void>): Promise<void> {
    const authHeader = context.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpException(401, { success: false, message: 'Missing bearer token' });
    }

    // Resolves a live user — throws 401 on invalid/expired tokens or deleted accounts.
    context.setValue('user', await this.authService.getUserFromToken(authHeader.slice('Bearer '.length)));

    await next();
  }
}
