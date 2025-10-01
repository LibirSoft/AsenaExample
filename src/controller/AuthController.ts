import type { UserService } from '../core/service/UserService.ts';
import { sign } from 'hono/jwt';
import { Cookie_secret, Token_secret } from '../env.ts';
import { AuthValidator } from '../middleWare/validator/AuthValidator.ts';
import { CreateUserValidator } from '../middleWare/validator/CreateUserValidator.ts';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import type { User } from '../core/schemas/User.ts';
import { logger } from '../utils/logger.ts';
import { Controller } from '@asenajs/asena/server';
import { Inject } from '@asenajs/asena/ioc';
import { Get, Post } from '@asenajs/asena/web';
import type { Context } from '@asenajs/hono-adapter';
import { ClientErrorStatusCode, SuccessStatusCode } from '@asenajs/asena/web-types';

@Controller('/auth')
export class AuthController {

  @Inject('UserService')
  private userService: UserService;

  @Post({ path: '/login', validator: AuthValidator })
  public async login(context: Context) {
    const body = await context.getBody<{ email: string }>();

    let user: User | null;

    try {
      user = await this.userService.getUserByEmail(body.email);
    } catch (e) {
      return context.send({ success: false, message: 'An error occurred' }, ClientErrorStatusCode.BadRequest);
    }

    if (!user) {
      return context.send({ success: false, message: 'User not found' }, ClientErrorStatusCode.NotFound);
    }

    const token = await sign({ id: user.id, email: user.email, name: user.name }, Token_secret);

    await context.setCookie('token', token, { secret: Cookie_secret });

    return context.send({ success: true, message: 'successfully logged in' }, SuccessStatusCode.Ok);
  }

  @Get({ path: '/logout', middlewares: [AuthMiddleware] })
  public async logout(context: Context) {
    await context.deleteCookie('token');

    return context.send({ success: true, message: 'successfully logged out' }, SuccessStatusCode.Ok);
  }

  @Post({ path: '/signup', validator: CreateUserValidator })
  public async signup(context: Context) {
    const body = await context.getBody<{ name: string; email: string }>();

    try {
      const user = await this.userService.createUser({
        name: body.name,
        email: body.email,
      });

      return context.send({ success: true, message: 'successfully signed up', data: user }, SuccessStatusCode.Created);
    } catch (e) {
      logger.error(e);

      return context.send({ success: false, message: 'An error occurred' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Get({ path: '/me', middlewares: [AuthMiddleware] })
  public async me(context: Context) {
    const user = context.getValue<User>('user');

    console.log(user);

    return context.send(user, SuccessStatusCode.Ok);
  }

}
