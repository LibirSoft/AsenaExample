import type { Context, MiddlewareService } from '@asenajs/asena';
import { Middleware } from '@asenajs/asena';

@Middleware()
export class TopMiddleware implements MiddlewareService {

  public async handle(context: Context, next: Function) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
