import { type Context, Inject, Middleware, type MiddlewareService } from '@asenajs/asena';
import type { Next } from 'hono';
import { UserService } from '../core/service/UserService.ts';

@Middleware()
export class TestMiddleware implements MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: Context, next: Next) {
    context.setValue('test', { name: 'ahmet', surname: 'yılmaz' });

    console.log(this.userService.getUsers());

    await next();
  }

}
