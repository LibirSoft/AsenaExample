import { UserService } from '../core/service/UserService.ts';
import { Middleware } from '@asenajs/asena/server';
import { MiddlewareService } from '@asenajs/hono-adapter';
import type { Context } from '@asenajs/hono-adapter';
import { Inject } from '@asenajs/asena/ioc';
import type { Next } from 'hono';

@Middleware()
export class TestMiddleware extends MiddlewareService {

  @Inject(UserService)
  private userService: UserService;

  public async handle(context: Context, next: Next) {
    context.setValue('test', { name: 'ahmet', surname: 'yılmaz' });

    console.log(this.userService.getUsers());

    await next();
  }

}
