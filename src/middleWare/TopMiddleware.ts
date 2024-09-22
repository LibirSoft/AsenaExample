import { Middleware } from 'asena';
import type { MiddlewareService } from 'asena';
import type { AsenaContext } from 'asena';

@Middleware()
export class TopMiddleware implements MiddlewareService<any, any> {

  public async handle(context: AsenaContext<any, any>, next: Function) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
