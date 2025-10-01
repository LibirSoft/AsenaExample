import type { Next } from 'hono';
import type { UserService } from '../../core/service/UserService.ts';
import { Cookie_secret, Token_secret } from '../../env.ts';
import { Jwt } from 'hono/utils/jwt';
import { HTTPException } from 'hono/http-exception';
import { Middleware } from '@asenajs/asena/server';
import type { Context, MiddlewareService } from '@asenajs/hono-adapter';
import { Inject } from '@asenajs/asena/ioc';
import { ClientErrorStatusCode } from '@asenajs/asena/web-types';
import type { User } from '../../core/schemas/User.ts';

@Middleware()
export class AuthMiddleware implements MiddlewareService {

  @Inject("UserService")
  private userService: UserService;

  public async handle(context: Context, next: Next): Promise<void> {
    const cookie = await context.getCookie('token', Cookie_secret);
    const response = context.send('Unauthorized');

    if (!cookie) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    let user: User | null = null;

    try {
      const verified = await Jwt.verify(cookie, Token_secret);

      console.log('ver', verified);

      user = await this.userService.getUserById(verified['id'] as string);
    } catch (e) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    if (!user) {
      throw new HTTPException(ClientErrorStatusCode.Unauthorized, { res: response as Response });
    }

    context.setValue('user', { name: user.name, id: user.id, email: user.email });

    await next();
  }

}
