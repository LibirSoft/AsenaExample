import 'reflect-metadata';
import { AsenaServerFactory } from '@asenajs/asena';
import { authComponents } from '@asenajs/asena-auth';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { AsenaLogger } from '@asenajs/asena-logger';
import { env } from './env';

const [adapter, logger] = createHonoAdapter({ logger: new AsenaLogger() });

const server = await AsenaServerFactory.create({
  adapter,
  logger,
  port: env.port,
  // Package components are never scanned (node_modules is not walked):
  // the AuthGuard that enforces @Protected, its middleware, the provider
  // registry and the WebSocket/session middlewares come in through imports.
  // Without them every @Protected route would silently stay public.
  imports: [...authComponents],
});

await server.start();
