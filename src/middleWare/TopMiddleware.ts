import { type AsenaContext, Middleware, type MiddlewareService } from '@asenajs/asena';

@Middleware()
export class TopMiddleware implements MiddlewareService {

  public async handle(context: AsenaContext<any, any>, next: Function) {
    console.log('Hello from Top middleware');

    console.log('headers:', context.req.header());

    await next();
  }

}
