import { StaticServe } from '@asenajs/asena/server';
import { type Context, StaticServeService } from '@asenajs/hono-adapter';

@StaticServe({ root: './public' })
export class StaticMiddleware extends StaticServeService {

  public rewriteRequestPath(path: string): string {
    return path.replace(/^\/static\/|^static\//, '');
  }

  public onFound(_path: string, _c: Context): void | Promise<void> {
    console.log('Yes you found the file ');
  }

  public onNotFound(path: string, c: Context): void | Promise<void> {
    console.log(`${path} is not found, you access ${c.req.path}`);
  }

}
