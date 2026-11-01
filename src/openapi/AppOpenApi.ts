import { OpenApi, OpenApiPostProcessor } from '@asenajs/asena-openapi';

/**
 * Generates the OpenAPI 3.1 spec from the existing Zod validators — the same
 * schemas that validate requests also document them. Zero extra annotations.
 *
 * Spec:      GET /openapi
 * Swagger UI GET /openapi/ui
 */
@OpenApi({
  info: {
    title: 'Asena Example API',
    version: '1.0.0',
    description:
      'A Todo + Chat application demonstrating AsenaJS best practices: IoC, Zod validation, ' +
      'session auth with @asenajs/asena-auth (Bearer token or HttpOnly cookie), Drizzle ' +
      'repositories with transactions, file uploads, static serving, WebSockets and testing.',
  },
  path: '/openapi',
  ui: true,
})
export class AppOpenApi extends OpenApiPostProcessor {}
