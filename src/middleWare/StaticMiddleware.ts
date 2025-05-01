import { Middleware, Override } from '@asenajs/asena/server';
import { serveStatic } from 'hono/bun';
import type { MiddlewareService } from '@asenajs/hono-adapter';
import type { Context } from 'hono';

@Middleware()
export class StaticMiddleware implements MiddlewareService {

  @Override()
  // @ts-ignore
  public async handle(context: Context, next) {

    return serveStatic({
      root: './',
      onNotFound: (path, c) => {
        console.log(`${path} is not found, you access ${c.req.path}`);
      },
      rewriteRequestPath: (path) => {
        return path.replace(/^\/static/, '');
      },
    })(context, next);
  }

}
