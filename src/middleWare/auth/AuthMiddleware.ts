import { type Context, Inject, Middleware, type MiddlewareService } from '@asenajs/asena';
import type { Next } from 'hono';
import { UserService } from '../../core/service/UserService.ts';
import { Cookie_secret, Token_secret } from '../../env.ts';
import { Jwt } from 'hono/utils/jwt';
import { HTTPException } from 'hono/http-exception';
import { ClientErrorStatusCode } from '@asenajs/asena/lib/server/web/http';

@Middleware()
export class AuthMiddleware implements MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: Context, next: Next) {
    const cookie = await context.getCookie('token', Cookie_secret);
    const response = context.send('Unauthorized');

    if (!cookie) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    let user: any;

    try {
      const verified = await Jwt.verify(cookie, Token_secret);

      user = await this.userService.getUserById(verified['id'] as number);
    } catch (e) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    if (!user) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    context.setValue('user', { userName: user.userName, id: user.id });

    await next();
  }

}
