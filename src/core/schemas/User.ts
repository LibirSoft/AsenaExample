import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const UserSchema = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type User = typeof UserSchema.$inferSelect;
export type NewUser = typeof UserSchema.$inferInsert;
export type UserSchemaType = typeof UserSchema;
