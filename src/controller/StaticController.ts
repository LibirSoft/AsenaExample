import { Controller } from '@asenajs/asena/server';
import { StaticMiddleware } from '../middleWare/StaticMiddleware.ts';
import { Get } from '@asenajs/asena/web';

@Controller('/static')
export class StaticController {

  @Get({ path: '/*', staticServe: StaticMiddleware })
  public static() {}

}
