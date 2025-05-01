import { UserService } from '../core/service/UserService.ts';
import { Middleware } from '@asenajs/asena/server';
import type { Context, MiddlewareService } from '@asenajs/hono-adapter';
import { Inject } from '@asenajs/asena/ioc';
import type { Next } from 'hono';

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
