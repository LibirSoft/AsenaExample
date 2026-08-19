import { Service } from '@asenajs/asena/decorators';
import { OnStart } from '@asenajs/asena/decorators/ioc';
import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import { env } from '../env';

@Service()
export class MigrateService {
  /**
   * Applies pending Drizzle migrations on boot. Uses a dedicated single
   * connection that is closed afterwards, so it never interferes with the
   * application pool owned by MainDatabase.
   */
  @OnStart()
  public async migrate(): Promise<void> {
    const sql = new SQL({ ...env.database, max: 1 });

    try {
      await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
    } finally {
      await sql.end();
    }
  }
}
