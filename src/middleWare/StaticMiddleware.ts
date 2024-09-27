import { Override } from '@asenajs/asena/dist/lib/server/components/components';
import { Middleware, type MiddlewareService } from '@asenajs/asena';
import { serveStatic } from 'hono/bun';

@Override()
@Middleware()
export class StaticMiddleware implements MiddlewareService {

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
