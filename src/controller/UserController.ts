import {Controller, Get, Inject} from 'asena/src';
import type {HonoRequest} from 'hono';
import {UserService} from '../core/service/UserService.ts';
import type {AsenaContext} from '../../../Asena/src/adapter/AsenaContext.ts';

@Controller("")
export class UserController {

  @Inject(UserService)
  private userService: UserService;

  @Get('/')
  public getUsers(context: AsenaContext<HonoRequest<any, any>, Response>) {
    return context.send(this.userService.getHello());
  }

}
