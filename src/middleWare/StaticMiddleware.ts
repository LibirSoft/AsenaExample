import { Middleware } from 'asena';
import type { MiddlewareService } from 'asena';
import { serveStatic } from 'hono/bun';
import { Override } from 'asena/src/server/components/components.ts';

@Override()
@Middleware()
export class StaticMiddleware implements MiddlewareService<any, any> {

  public async handle(context, next) {
    return serveStatic({
      root: './public',
      onNotFound: (path, c) => {
        console.log(`${path} is not found, you access ${c.req.path}`);
      },
      rewriteRequestPath: (path) => {
        return path.replace(/^\/static/, '');
      },
    })(context, next);
  }

}
