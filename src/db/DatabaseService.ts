import { Inject, ServerService } from 'asena';
import { AsenaService } from 'asena/src/services';
import { Migrate } from './Migrate.ts';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

@ServerService()
export class DatabaseService extends AsenaService {

  @Inject(Migrate)
  private migrate: Migrate;

  private _connection: PostgresJsDatabase<Record<string, never>>;

  protected async onStart() {
    await this.migrate.migrate();

    this._connection = drizzle(
      postgres({
        database: 'postgres',
        password: 'postgres',
        user: 'postgres',
        port: 5432,
        host: 'localhost',
      }),
    );
  }

  public get connection(): PostgresJsDatabase<Record<string, never>> {
    return this._connection;
  }

}
