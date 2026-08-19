import { Controller } from '@asenajs/asena/decorators';
import { Get } from '@asenajs/asena/decorators/http';
import { type Context } from '@asenajs/hono-adapter';
import { Hidden } from '@asenajs/asena-openapi';

@Controller('/health')
export class HealthController {
  @Hidden()
  @Get('/')
  public health(context: Context) {
    return context.send({ status: 'ok', uptime: process.uptime() }, 200);
  }
}
