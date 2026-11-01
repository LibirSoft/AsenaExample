import { Config } from '@asenajs/asena/decorators';
import { isHttpException, isValidationError, type NotFoundRequest } from '@asenajs/asena/adapter';
import { ConfigService, type Context } from '@asenajs/hono-adapter';
import { GlobalCors } from '../middlewares/GlobalCors';

@Config()
export class AppConfig extends ConfigService {
  public globalMiddlewares() {
    return [GlobalCors];
  }

  public async onError(error: Error, context: Context): Promise<Response> {
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
      const response = error.getResponse?.();

      if (!response) {
        return context.send({ success: false, message: error.message }, error.status);
      }

      // Domain exceptions already carry the { success: false, message } envelope.
      if (response.headers.get('content-type')?.includes('application/json')) {
        return response;
      }

      // Plain-text exceptions — e.g. the asena-auth guard's 401 / 403 — get the
      // same envelope; their headers (WWW-Authenticate: Bearer) are kept.
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json');

      return new Response(JSON.stringify({ success: false, message: await response.text() }), {
        status: response.status,
        headers,
      });
    }

    console.error('[AppConfig] Unhandled error:', error);

    return context.send({ success: false, message: 'Internal Server Error' }, 500);
  }

  public onNotFound(context: Context, request: NotFoundRequest): Response | Promise<Response> {
    return context.send({ success: false, message: 'Not Found', path: request.path }, 404);
  }
}
