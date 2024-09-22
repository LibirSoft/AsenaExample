import type { AsenaContext } from 'asena';
import { Controller, Get, Inject, Post } from 'asena';
import type { HonoRequest } from 'hono';
import { UserService } from '../core/service/UserService.ts';
import { SuccessStatusCode } from 'asena/src/server/web/http';
import type { User } from '../core/entitiy/User.ts';
import { CreateUserValidator } from '../middleWare/validator/CreateUserValidator.ts';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';

@Controller({ path: '/users', name: 'User Controller', middlewares: [AuthMiddleware] })
export class UserController {

  @Inject(UserService)
  private userService: UserService;

  @Get('/')
  public async getUsers(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const users = await this.userService.getUsers();

    return context.send(users, SuccessStatusCode.OK);
  }

  @Post({ path: '/', validator: CreateUserValidator, description: 'Add a new user' })
  public async addUser(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const user = await context.getBody<User>();

    await this.userService.addUser(user);

    return context.send('User added successfully', SuccessStatusCode.CREATED);
  }

}
