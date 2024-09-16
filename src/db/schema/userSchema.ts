import { boolean, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: serial('id').primaryKey().notNull(),
  firstName: varchar('firstName').notNull(),
  lastName: varchar('lastName').notNull(),
  isActive: boolean('isActive').notNull(),
});
