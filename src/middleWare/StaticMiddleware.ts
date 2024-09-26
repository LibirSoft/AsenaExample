import { Middleware } from '@asenajs/asena';
import type { MiddlewareService } from '@asenajs/asena';
import { serveStatic } from 'hono/bun';
import { Override } from '@asenajs/asena/lib/server/components/components.ts';

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
