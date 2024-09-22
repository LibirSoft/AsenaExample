import { Inject, Middleware } from 'asena';
import type { HonoRequest, Next } from 'hono';
import { UserService } from '../core/service/UserService.ts';
import type { MiddlewareService } from 'asena';
import type { AsenaContext } from 'asena';

@Middleware()
export class TestMiddleware implements MiddlewareService<HonoRequest<any, any>, Response> {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: AsenaContext<HonoRequest, Response>, next: Next) {
    context.setValue('test', { name: 'ahmet', surname: 'yılmaz' });

    console.log(this.userService.getUsers());

    await next();
  }

}
