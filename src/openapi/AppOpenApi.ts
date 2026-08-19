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
      'A Todo application demonstrating AsenaJS best practices: IoC, Zod validation, ' +
      'JWT auth, Drizzle repositories with transactions, file uploads, static serving and testing.',
  },
  path: '/openapi',
  ui: true,
})
export class AppOpenApi extends OpenApiPostProcessor {}
