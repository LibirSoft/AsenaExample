import { integer, pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';

/** Roles checked by @Roles(...) guards. Signup always creates a 'user'. */
export const USER_ROLES = ['user', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userName: varchar('user_name', { length: 50 }).notNull().unique(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  age: integer('age').notNull(),
  passwordHash: text('password_hash').notNull(),
  profileImage: text('profile_image'),
  role: varchar('role', { length: 20, enum: USER_ROLES }).notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
