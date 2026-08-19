import { Controller } from '@asenajs/asena/decorators';
import { Get } from '@asenajs/asena/decorators/http';
import { Hidden } from '@asenajs/asena-openapi';
import { PublicStaticServe } from '../statics/PublicStaticServe';

/** Serves public/ (profile uploads) — hidden from the OpenAPI spec. */
@Hidden()
@Controller('/static')
export class StaticController {
  @Get({ path: '/*', staticServe: PublicStaticServe })
  public static() {}
}
