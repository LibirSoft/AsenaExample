import type { HonoRequest, Next } from 'hono';
import { UserService } from '../../core/service/UserService.ts';
import { Cookie_secret, Token_secret } from '../../env.ts';
import { Jwt } from 'hono/utils/jwt';
import { HTTPException } from 'hono/http-exception';
import { Middleware } from '@asenajs/asena/server';
import type { MiddlewareService } from '@asenajs/hono-adapter';
import { Inject } from '@asenajs/asena/ioc';
import type { AsenaContext } from '@asenajs/asena/adapter';
import { ClientErrorStatusCode } from '@asenajs/asena/web-types';

@Middleware()
export class AuthMiddleware implements MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: AsenaContext<HonoRequest, Response>, next: Next) {
    const cookie = await context.getCookie('token', Cookie_secret);
    const response = context.send('Unauthorized');

    if (!cookie) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    let user: any;

    try {
      const verified = await Jwt.verify(cookie, Token_secret);

      console.log('ver', verified);

      user = await this.userService.getUserById(verified['id'] as number);
    } catch (e) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    if (!user) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    context.setValue('user', { userName: user.userName, id: user.id });

    await next();
  }

}
