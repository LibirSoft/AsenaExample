import { boolean, integer, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { chatRooms } from './chat-room.schema';

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  content: varchar('content', { length: 2000 }).notNull(),
  roomId: integer('room_id')
    .notNull()
    .references(() => chatRooms.id, { onDelete: 'cascade' }),
  senderId: integer('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
