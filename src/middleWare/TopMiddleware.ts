import { Middleware } from '@asenajs/asena/server';
import type { Context } from '@asenajs/hono-adapter';
import { MiddlewareService } from '@asenajs/hono-adapter';

@Middleware()
export class TopMiddleware extends MiddlewareService {

  public async handle(context: Context, next: Function) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
