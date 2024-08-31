import { Controller, Delete, Get, Inject, Post, Put } from 'asena/src';
import { TopMiddleware } from '../middleWare/TopMiddleware.ts';
import type { Context } from 'hono';
import { ClientErrorStatusCode, SuccessStatusCode } from 'asena/src/server/web/http/HttpStatus';
import type { User } from '../core/entitiy/User.ts';
import { UserService } from '../core/service/UserService.ts';
import { TestMiddleware } from '../middleWare/TestMiddleware.ts';

@Controller({ path: 'api/v2/user', middlewares: [TopMiddleware], name: 'UserControllerV2' })
export class UserControllerV2 {

  @Inject(UserService)
  private userService: UserService;

  @Get({ path: '/', description: 'Get all users', middlewares: [TestMiddleware] })
  public getUsers(context: Context) {
    return context.json({ users: this.userService.getUsers() }, SuccessStatusCode.OK);
  }

  @Get({ path: '/:name', description: 'Get user by name', middlewares: [TestMiddleware] })
  public async getUserByName(context: Context) {
    const { name } = context.req.param();

    if (!name) {
      return context.json({ message: 'Name is required' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.json({ user: this.userService.getUserByName(name) }, SuccessStatusCode.OK);
  }

  @Post({ path: '/', description: 'Add a user', middlewares: [TestMiddleware] })
  public async addUser(context: Context) {
    const user = await context.req.json<User>();

    if (!user) {
      return context.json({ message: 'Name and age are required' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    const found = this.userService.getUsers().find((u) => u.name === user.name);

    if (found) {
      return context.json({ message: 'User already exists' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    this.userService.addUser(user);

    return context.json({ message: 'User added' }, SuccessStatusCode.CREATED);
  }

  @Put({ path: '/:name', description: 'Update a user', middlewares: [TestMiddleware] })
  public async updateUser(context: Context) {
    const { name } = context.req.param();
    const user = await context.req.json<User>();

    if (!name || !user) {
      return context.json({ message: 'Name and update data required' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    const found = this.userService.getUsers().find((u) => u.name === name);

    if (!found) {
      return context.json({ message: 'User not found' }, ClientErrorStatusCode.NOT_FOUND);
    }

    this.userService.updateUser(name, user);

    return context.json({ message: 'User updated' }, SuccessStatusCode.OK);
  }

  @Delete({ path: '/:name', description: 'Delete a user', middlewares: [TestMiddleware] })
  public async deleteUser(context: Context) {
    const { name } = context.req.param();

    if (!name) {
      return context.json({ message: 'Name is required' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    const found = this.userService.getUsers().find((u) => u.name === name);

    if (!found) {
      return context.json({ message: 'User not found' }, ClientErrorStatusCode.NOT_FOUND);
    }

    this.userService.deleteUser(name);

    return context.json({ message: 'User deleted' }, SuccessStatusCode.OK);
  }

}
