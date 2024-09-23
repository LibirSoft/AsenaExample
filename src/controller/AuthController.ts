import { type AsenaContext, Controller, Get, Inject, Post } from 'asena';
import type { HonoRequest } from 'hono';
import { UserService } from '../core/service/UserService.ts';
import { ClientErrorStatusCode, SuccessStatusCode } from 'asena/src/server/web/http';
import { sign } from 'hono/jwt';
import { Cookie_secret, Token_secret } from '../env.ts';
import { AuthValidator } from '../middleWare/validator/AuthValidator.ts';
import { CreateUserValidator } from '../middleWare/validator/CreateUserValidator.ts';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import type { User } from '../core/entitiy/User.ts';
import { logger } from '../utils/logger.ts';
import * as path from 'node:path';
import * as fs from 'node:fs';

@Controller('/auth')
export class AuthController {

  @Inject(UserService)
  private userService: UserService;

  @Post({ path: '/login', validator: AuthValidator })
  public async login(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const body = await context.getBody<{ userName: string; password: string }>();

    let user: { id: number; firstName: string; lastName: string; password: string; isActive: boolean };

    try {
      user = await this.userService.getUserByFirstName(body.userName, body.password);
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

  @Post({ path: '/signup', validator: CreateUserValidator })
  public async signup(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const body = await context.getFormData();

    const file = body.get('file') as File;

    const fileStream = await file.arrayBuffer();

    const imagePath = path.join('public/profile', file.name);

    fs.writeFileSync(imagePath, Buffer.from(fileStream));

    let age: number;

    try {
      age = parseInt(body.get('age') as string, 10);
    } catch (e) {
      logger.error(e);

      return context.send('Age must be a number', ClientErrorStatusCode.BAD_REQUEST);
    }

    const createUSerDto = {
      userName: body.get('userName') as string,
      firstName: body.get('firstName') as string,
      lastName: body.get('lastName') as string,
      age,
      password: body.get('password') as string,
      profileImage: imagePath,
    };

    try {
      await this.userService.createUser(createUSerDto);
    } catch (e) {
      logger.error(e);

      return context.send('An error occurred', ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.send({ success: true, message: 'successfully signed up' }, SuccessStatusCode.OK);
  }

  @Get({ path: '/me', middlewares: [AuthMiddleware] })
  public async me(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const user = context.getValue<User>('user');

    return context.send(user, SuccessStatusCode.OK);
  }

}
