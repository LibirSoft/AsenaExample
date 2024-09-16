import { Controller, Get, Inject } from 'asena';
import type { HonoRequest } from 'hono';
import type { AsenaContext } from 'asena';
import { UserService } from '../core/service/UserService.ts';
import { SuccessStatusCode } from 'asena/src/server/web/http';

@Controller()
export class UserController {

  @Inject(UserService)
  private userService: UserService;

  @Get('/')
  public async getUsers(context: AsenaContext<HonoRequest<any, any>, Response>) {
    const users = await this.userService.getUsers();

    return context.send(users, SuccessStatusCode.OK);
  }

}
