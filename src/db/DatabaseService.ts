import { AsenaDatabaseService, Database } from '@asenajs/asena-drizzle';
import { logger } from '../utils/logger.ts';

@Database({
  type: 'bun-sql',
  config: {
    host: 'localhost',
    port: 5432,
    database: 'asenatest',
    user: 'postgres',
    password: 'postgres',
  },
  name: 'DatabaseService',
  logger,
})
export class DatabaseService extends AsenaDatabaseService {}
