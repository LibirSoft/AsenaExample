import { Inject, Middleware, type Context, type MiddlewareService } from '@asenajs/asena';
import { UserService } from '../../core/service/UserService';
import type { Next } from 'hono';
import { Cookie_secret, Token_secret } from '../../env';
import { HTTPException } from 'hono/http-exception';
import { Jwt } from 'hono/utils/jwt';
import { ClientErrorStatusCode } from '@asenajs/asena/dist/lib/server/web/http';

@Middleware()
export class WSAuthMiddleware implements MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: Context, next: Next) {
    const cookie = await context.getCookie('token', Cookie_secret);
    const response = context.send('Unauthorized');

    if (!cookie) {
      console.log('no cookie');

      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    let user: any;

    try {
      const verified = await Jwt.verify(cookie, Token_secret);

      console.log('ver', verified);

      user = await this.userService.getUserById(verified['id'] as number);
    } catch (e) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    if (!user) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    context.setWebSocketValue({ userName: user.userName, id: user.id });

    await next();
  }

}
