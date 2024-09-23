import { boolean, pgTable, serial, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const user = pgTable('user', {
  id: serial('id').primaryKey().notNull(),
  userName: varchar('userName')
    .notNull()
    .unique()
    .default(sql`gen_random_uuid()`),
  firstName: varchar('firstName').notNull(),
  lastName: varchar('lastName').notNull(),
  password: varchar('password')
    .notNull()
    .default(sql`gen_random_uuid()`),
  profileImage: varchar('profileImage'),
  isActive: boolean('isActive').notNull(),
});
