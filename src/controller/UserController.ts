import { Controller, Delete, Get, Inject, Post, Put } from 'asena/src';
import { ClientErrorStatusCode, SuccessStatusCode } from 'asena/src/server/web/http/HttpStatus';
import type { Context } from 'hono';
import { UserService } from '../core/service/UserService.ts';
import type { User } from '../core/entity/User.ts';

@Controller('api/v1/user')
export class UserController {

  @Inject(UserService)
  private userService: UserService;

  @Get('/')
  public getUsers(context: Context) {
    return context.json({ users: this.userService.getUsers() }, SuccessStatusCode.OK);
  }

  @Get('/:name')
  public async getUserByName(context: Context) {
    const { name } = context.req.param();

    if (!name) {
      return context.json({ message: 'Name is required' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.json({ user: this.userService.getUserByName(name) }, SuccessStatusCode.OK);
  }

  @Post('/')
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

  @Put('/:name')
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

  @Delete('/:name')
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
