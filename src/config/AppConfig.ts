import { Config } from '@asenajs/asena/decorators';
import { isHttpException, isValidationError, type NotFoundRequest } from '@asenajs/asena/adapter';
import { ConfigService, type Context } from '@asenajs/hono-adapter';
import { GlobalCors } from '../middlewares/GlobalCors';

@Config()
export class AppConfig extends ConfigService {
  public globalMiddlewares() {
    return [GlobalCors];
  }

  public onError(error: Error, context: Context): Response | Promise<Response> {
    // Validation errors first: a ValidationError is itself an HTTP exception,
    // so a generic isHttpException() branch above it would swallow it.
    if (isValidationError(error)) {
      const errors = error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return context.send({ success: false, message: 'Validation failed', errors }, 400);
    }

    if (isHttpException(error)) {
      return error.getResponse?.() ?? context.send({ success: false, message: error.message }, error.status);
    }

    console.error('[AppConfig] Unhandled error:', error);

    return context.send({ success: false, message: 'Internal Server Error' }, 500);
  }

  public onNotFound(context: Context, request: NotFoundRequest): Response | Promise<Response> {
    return context.send({ success: false, message: 'Not Found', path: request.path }, 404);
  }
}
