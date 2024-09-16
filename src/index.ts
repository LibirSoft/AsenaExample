import { AsenaServer } from 'asena';
import { logger } from './utils/logger.ts';
import './controller/UserController';

await new AsenaServer().logger(logger).port(3000).start();