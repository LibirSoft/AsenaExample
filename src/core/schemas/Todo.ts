import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { UserSchema } from './User.ts';

export const TodoSchema = pgTable('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => UserSchema.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Todo = typeof TodoSchema.$inferSelect;
export type NewTodo = typeof TodoSchema.$inferInsert;
export type TodoSchemaType = typeof TodoSchema;
