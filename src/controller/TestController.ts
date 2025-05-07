import { Controller } from '@asenajs/asena/server';
import { Get } from '@asenajs/asena/web';
import type { Context } from '@asenajs/hono-adapter';

@Controller('/')
export class TestController {

  @Get('/')
  public async index(context: Context) {
    return context.send('Hello World!');
  }

}
