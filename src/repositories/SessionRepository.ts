import { Repository, BaseRepository } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { eq, lt } from 'drizzle-orm';
import { sessions } from '../database/schemas/session.schema';
import type Schemas from '../database/schemas';

/**
 * Data access for login sessions. Owned by AppAuth (the session domain) and
 * used only through DrizzleSessionStore — no other service injects it.
 */
@Repository({
  table: sessions,
  databaseService: 'MainDatabase',
  name: 'SessionRepository',
})
export class SessionRepository extends BaseRepository<typeof sessions, BunSQLDatabase<typeof Schemas>> {
  public findAllByUserId(userId: number) {
    return this.findAll(eq(sessions.userId, userId));
  }

  public deleteAllByUserId(userId: number) {
    return this.delete(eq(sessions.userId, userId));
  }

  public deleteExpired(now: Date) {
    return this.delete(lt(sessions.expiresAt, now));
  }
}
