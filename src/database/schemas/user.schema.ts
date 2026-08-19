import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userName: varchar('user_name', { length: 50 }).notNull().unique(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  age: integer('age').notNull(),
  passwordHash: text('password_hash').notNull(),
  profileImage: text('profile_image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
