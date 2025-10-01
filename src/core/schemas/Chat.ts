import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const MessageSchema = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  senderId: uuid('sender_id').notNull(),
  roomId: uuid('room_id').notNull(),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const ChatRoomSchema = pgTable('chat_rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Message = typeof MessageSchema.$inferSelect;
export type NewMessage = typeof MessageSchema.$inferInsert;
export type MessageSchemaType = typeof MessageSchema;

export type ChatRoom = typeof ChatRoomSchema.$inferSelect;
export type NewChatRoom = typeof ChatRoomSchema.$inferInsert;
export type ChatRoomSchemaType = typeof ChatRoomSchema;
