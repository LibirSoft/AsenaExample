import { Inject, ServerService } from 'asena';
import { AsenaService } from 'asena/src/services';
import { Migrate } from './Migrate.ts';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

@ServerService()
export class DatabaseService extends AsenaService {

  @Inject(Migrate)
  private migrate: Migrate;

  private _connection: PostgresJsDatabase<any>;

  protected async onStart() {
    await this.migrate.migrate();

    // configure the database connection
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

  public get connection() {
    return this._connection;
  }

}
