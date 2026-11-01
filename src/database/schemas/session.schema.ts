import { index, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';
import type { AppUser } from '../../auth/AppAuth';
import { jsonb } from './columns';
import { users } from './user.schema';

/**
 * Login sessions of the @asenajs/asena-auth provider (see DrizzleSessionStore).
 * Only the SHA-256 of a session token is stored — a leaked row cannot be
 * replayed. Deleting a user cascades to their sessions, so a removed account
 * loses access on its very next request.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** The user snapshot passed to createSession() — what handlers read from the session. */
    user: jsonb<AppUser>('user').notNull(),
    createdAt: timestamp('created_at').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);
