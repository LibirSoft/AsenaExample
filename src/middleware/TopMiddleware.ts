import { Middleware, type MiddlewareService } from 'asena/src';
import type { Context, Next } from 'hono';

@Middleware()
export class TopMiddleware implements MiddlewareService {

  public async handle(context: Context, next: Next) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
