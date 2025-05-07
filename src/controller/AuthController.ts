import { UserService } from '../core/service/UserService.ts';
import { sign } from 'hono/jwt';
import { Cookie_secret, Token_secret } from '../env.ts';
import { AuthValidator } from '../middleWare/validator/AuthValidator.ts';
import { CreateUserValidator } from '../middleWare/validator/CreateUserValidator.ts';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import type { User } from '../core/entitiy/User.ts';
import { logger } from '../utils/logger.ts';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { Controller } from '@asenajs/asena/server';
import { Inject } from '@asenajs/asena/ioc';
import { Get, Post } from '@asenajs/asena/web';
import type { Context } from '@asenajs/hono-adapter';
import { ClientErrorStatusCode, SuccessStatusCode } from '@asenajs/asena/web-types';

@Controller('/auth')
export class AuthController {

  @Inject(UserService)
  private userService: UserService;

  @Post({ path: '/login', validator: AuthValidator })
  public async login(context: Context) {
    const body = await context.getBody<{ userName: string; password: string }>();

    let user: User | null;

    try {
      user = await this.userService.getUserByFirstName(body.userName, body.password);
    } catch (e) {
      return context.send({ success: false, message: 'An error occurred' }, ClientErrorStatusCode.BadRequest);
    }

    if (!user) {
      return context.send({ success: false, message: 'User not found' }, ClientErrorStatusCode.NotFound);
    }

    const token = await sign({ ...user }, Token_secret);

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

      return context.send('Age must be a number', ClientErrorStatusCode.BadRequest);
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
      this.userService.createUser(createUSerDto);
    } catch (e) {
      logger.error(e);

      return context.send('An error occurred', ClientErrorStatusCode.BadRequest);
    }

    return context.send({ success: true, message: 'successfully signed up' }, SuccessStatusCode.Ok);
  }

  @Get({ path: '/me', middlewares: [AuthMiddleware] })
  public async me(context: Context) {
    const user = context.getValue<User>('user');

    console.log(user);

    return context.send(user, SuccessStatusCode.Ok);
  }

}
