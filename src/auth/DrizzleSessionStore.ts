import type { AuthSessionStore, StoredSession } from '@asenajs/asena-auth';
import type { SessionRepository } from '../repositories/SessionRepository';
import type { sessions } from '../database/schemas/session.schema';
import type { AppUser } from './AppAuth';

type SessionRow = typeof sessions.$inferSelect;

/**
 * Persists asena-auth sessions in PostgreSQL, so they survive restarts and
 * hot reloads and are shared by every instance behind a load balancer (the
 * default MemoryAuthStore is per process).
 *
 * The provider owns the session semantics — expiry checks, sliding, absolute
 * lifetime; a store only maps rows. `get()` may return an expired row: the
 * provider rejects it.
 */
export class DrizzleSessionStore implements AuthSessionStore<AppUser> {
  constructor(private readonly repository: SessionRepository) {}

  public async create(session: StoredSession<AppUser>): Promise<void> {
    // Housekeeping on the (rare) login path keeps the table from growing with
    // abandoned sessions — no background job needed for an example app.
    await this.repository.deleteExpired(new Date());

    await this.repository.create({
      id: session.id,
      userId: Number(session.userId),
      user: session.user,
      createdAt: new Date(session.createdAt),
      expiresAt: new Date(session.expiresAt),
    });
  }

  public async get(id: string): Promise<StoredSession<AppUser> | null> {
    const row = await this.repository.findById(id);

    return row ? toStoredSession(row) : null;
  }

  public async delete(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }

  public async deleteByUser(userId: string): Promise<void> {
    await this.repository.deleteAllByUserId(Number(userId));
  }

  public async touch(id: string, expiresAt: number): Promise<void> {
    await this.repository.updateById(id, { expiresAt: new Date(expiresAt) });
  }

  /** Enables listUserSessions() — the "active devices" view. */
  public async listByUser(userId: string): Promise<StoredSession<AppUser>[]> {
    return (await this.repository.findAllByUserId(Number(userId))).map(toStoredSession);
  }
}

function toStoredSession(row: SessionRow): StoredSession<AppUser> {
  return {
    id: row.id,
    userId: String(row.userId),
    user: row.user,
    createdAt: row.createdAt.getTime(),
    expiresAt: row.expiresAt.getTime(),
  };
}
