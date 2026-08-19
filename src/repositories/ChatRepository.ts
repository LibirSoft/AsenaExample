import { Repository, BaseRepository } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { and, desc, eq } from 'drizzle-orm';
import { chatRooms } from '../database/schemas/chat-room.schema';
import { chatRoomMembers } from '../database/schemas/chat-room-member.schema';
import { messages } from '../database/schemas/message.schema';
import type Schemas from '../database/schemas';

/**
 * Data access for the chat domain (rooms, memberships, messages). The primary
 * table is `chat_rooms`; membership and message queries go through `this.db`
 * so they join any active @Transaction started by ChatService.
 */
@Repository({
  table: chatRooms,
  databaseService: 'MainDatabase',
  name: 'ChatRepository',
})
export class ChatRepository extends BaseRepository<typeof chatRooms, BunSQLDatabase<typeof Schemas>> {
  // --- rooms ---

  public findAllRooms() {
    return this.db.select().from(chatRooms).orderBy(desc(chatRooms.createdAt));
  }

  public async findRoomById(roomId: number) {
    const [room] = await this.db.select().from(chatRooms).where(eq(chatRooms.id, roomId)).limit(1);
    return room ?? null;
  }

  // --- memberships ---

  public async findMember(roomId: number, userId: number) {
    const [member] = await this.db
      .select()
      .from(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)))
      .limit(1);
    return member ?? null;
  }

  /** Idempotent — the unique(roomId, userId) constraint makes repeats no-ops. */
  public insertMember(roomId: number, userId: number) {
    return this.db.insert(chatRoomMembers).values({ roomId, userId }).onConflictDoNothing();
  }

  public deleteMember(roomId: number, userId: number) {
    return this.db
      .delete(chatRoomMembers)
      .where(and(eq(chatRoomMembers.roomId, roomId), eq(chatRoomMembers.userId, userId)));
  }

  // --- messages ---

  public async createMessage(data: typeof messages.$inferInsert) {
    const [message] = await this.db.insert(messages).values(data).returning();
    return message;
  }

  public async findMessageById(messageId: number) {
    const [message] = await this.db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
    return message ?? null;
  }

  public findMessagesByRoomId(roomId: number, limit: number) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.roomId, roomId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);
  }

  public async markMessageAsRead(messageId: number) {
    await this.db.update(messages).set({ isRead: true }).where(eq(messages.id, messageId));
  }

  public deleteMessageById(messageId: number) {
    return this.db.delete(messages).where(eq(messages.id, messageId));
  }
}
