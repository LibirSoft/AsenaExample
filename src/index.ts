import { AsenaServer } from 'asena/src';
import { logger } from './utils/logger.ts';

const server = new AsenaServer().logger(logger).port(3000);

await server.start();