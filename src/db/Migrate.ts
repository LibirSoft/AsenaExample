import { Service } from '@asenajs/asena';
import { logger } from '../utils/logger.ts';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

@Service()
export class Migrate {

  public async migrate() {
    logger.info('Migrating the database');

    const sql = postgres({
      database: 'postgres',
      password: 'postgres',
      user: 'postgres',
      port: 5432,
      host: 'localhost',
      max: 1,
      onnotice: (notice) => logger.info('Database Notice:\n', notice),
    });

    await migrate(drizzle(sql), { migrationsFolder: './src/db/drizzle' });

    logger.info('Migration completed');
  }

}
