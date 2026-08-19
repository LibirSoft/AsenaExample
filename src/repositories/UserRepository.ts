import { Repository, BaseRepository } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { eq } from 'drizzle-orm';
import { users } from '../database/schemas/user.schema';
import type Schemas from '../database/schemas';

@Repository({
  table: users,
  databaseService: 'MainDatabase',
  name: 'UserRepository',
})
export class UserRepository extends BaseRepository<typeof users, BunSQLDatabase<typeof Schemas>> {
  public findByUserName(userName: string) {
    return this.findOne(eq(users.userName, userName));
  }
}
