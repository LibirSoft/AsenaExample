import { Inject, Middleware, type MiddlewareService } from 'asena/src';
import type { Context, Next } from 'hono';
import { UserService } from '../core/service/UserService.ts';

@Middleware()
export class TestMiddleware implements MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: Context, next: Next) {
    console.log('Hello from Test middleware');

    console.log('users: ', this.userService.getUsers());

    console.log('headers:', context.req.header());

    await next();
  }

}
