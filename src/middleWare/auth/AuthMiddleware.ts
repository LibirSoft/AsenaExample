import type { AsenaContext, MiddlewareService } from 'asena';
import { Inject, Middleware } from 'asena';
import type { HonoRequest, Next } from 'hono';
import { UserService } from '../../core/service/UserService.ts';
import { Cookie_secret, Token_secret } from '../../env.ts';
import { Jwt } from 'hono/utils/jwt';
import { HTTPException } from 'hono/http-exception';
import { ClientErrorStatusCode } from 'asena/src/server/web/http';

@Middleware()
export class AuthMiddleware implements MiddlewareService<HonoRequest<any, any>, Response> {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: AsenaContext<HonoRequest, Response>, next: Next) {
    const cookie = await context.getCookie('token', Cookie_secret);
    const response = context.send('Unauthorized');

    if (!cookie) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    try {
      const verified = await Jwt.verify(cookie, Token_secret);

      const user = await this.userService.getUserById(verified['id'] as number);

      context.setValue('user', user);
    } catch (e) {
      throw new HTTPException(ClientErrorStatusCode.UNAUTHORIZED, { res: response as Response });
    }

    await next();
  }

}