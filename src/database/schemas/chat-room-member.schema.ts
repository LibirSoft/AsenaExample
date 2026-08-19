import { integer, pgTable, serial, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './user.schema';
import { chatRooms } from './chat-room.schema';

export const chatRoomMembers = pgTable(
  'chat_room_members',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => chatRooms.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  // A user joins a room at most once — repeated joins stay no-ops.
  (table) => [unique('chat_room_members_room_user_unique').on(table.roomId, table.userId)],
);
