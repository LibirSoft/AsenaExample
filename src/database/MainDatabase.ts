import { Database, AsenaDatabaseService } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import type Schemas from './schemas';
import { env } from '../env';

@Database({
  type: 'bun-sql',
  config: { ...env.database },
  name: 'MainDatabase',
})
export class MainDatabase extends AsenaDatabaseService<BunSQLDatabase<typeof Schemas>> {}
