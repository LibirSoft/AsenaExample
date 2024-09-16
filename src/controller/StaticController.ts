import { Controller, Get } from 'asena';
import { StaticMiddleware } from '../middleWare/StaticMiddleware.ts';

@Controller('/static')
export class StaticController {

  @Get({ path: '/*', middlewares: [StaticMiddleware], staticServe: true })
  public static() {}

}
