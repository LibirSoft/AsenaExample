import { AsenaServer } from 'asena';
import { logger } from './utils/logger.ts';

await new AsenaServer().logger(logger).port(3000).start();
