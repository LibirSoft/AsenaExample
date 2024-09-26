import type { AsenaContext, MiddlewareService } from '@asenajs/asena';
import { Middleware } from '@asenajs/asena';

@Middleware()
export class TopMiddleware implements MiddlewareService<any, any> {

  public async handle(context: AsenaContext<any, any>, next: Function) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
