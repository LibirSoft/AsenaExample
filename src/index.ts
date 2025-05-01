import { AsenaServer } from '@asenajs/asena';
import { logger } from './utils/logger.ts';
import { createHonoAdapter } from '@asenajs/hono-adapter';

const [adapter, serverLogger] = createHonoAdapter(logger);

await new AsenaServer(adapter, serverLogger).port(3000).start(true);
