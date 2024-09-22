import { type AsenaContext, Controller, Inject, Post } from 'asena';
import type { HonoRequest } from 'hono';
import { UserService } from '../core/service/UserService.ts';
import { ClientErrorStatusCode, SuccessStatusCode } from 'asena/src/server/web/http';
import { sign } from 'hono/jwt';
import { Cookie_secret, Token_secret } from '../env.ts';
import { AuthValidator } from '../middleWare/validator/AuthValidator.ts';

@Controller('/auth')
export class AuthController {

  @Inject(UserService)
  private userService: UserService;

  @Post({ path: '/login', validator: AuthValidator })
  public async login(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const body = await context.getBody<{ firstname: string; password: string }>();

    let user: { id: number; firstName: string; lastName: string; password: string; isActive: boolean };

    try {
      user = await this.userService.getUserByFirstName(body.firstname, body.password);
    } catch (e) {
      return context.send('An error occurred', ClientErrorStatusCode.BAD_REQUEST);
    }

    if (!user) {
      return context.send('User not found', ClientErrorStatusCode.BAD_REQUEST);
    }

    const token = await sign(user, Token_secret);

    await context.setCookie('token', token, { secret: Cookie_secret });

    return context.send({ success: true, message: 'successfully logged in' }, SuccessStatusCode.OK);
  }

}
