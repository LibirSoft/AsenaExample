import { boolean, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
  id: serial('id').primaryKey().notNull(),
  firstName: varchar('firstName').notNull().unique(),
  lastName: varchar('lastName').notNull(),
  password: varchar('password').notNull().default('password'),
  isActive: boolean('isActive').notNull(),
});
