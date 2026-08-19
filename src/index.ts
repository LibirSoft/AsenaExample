import 'reflect-metadata';
import { AsenaServerFactory } from '@asenajs/asena';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { AsenaLogger } from '@asenajs/asena-logger';
import { env } from './env';

const [adapter, logger] = createHonoAdapter({ logger: new AsenaLogger() });

const server = await AsenaServerFactory.create({
  adapter,
  logger,
  port: env.port,
});

await server.start();
