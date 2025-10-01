import { BaseRepository, Repository } from '@asenajs/asena-drizzle';
import type { ChatRoom, ChatRoomSchemaType, Message, NewChatRoom, NewMessage } from '../schemas/Chat.ts';
import { ChatRoomSchema, MessageSchema } from '../schemas/Chat.ts';
import { and, desc, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

export interface CreateMessageDto {
  content: string;
  roomId: string;
}

export interface CreateChatRoomDto {
  name: string;
  description?: string;
}

@Repository({
  databaseService: 'DatabaseService',
  table: ChatRoomSchema,
  name: 'ChatRepository',
})
export class ChatRepository extends BaseRepository<ChatRoomSchemaType, BunSQLDatabase> {

  // Chat Room operations
  public async createChatRoom(userId: string, createChatRoomDto: CreateChatRoomDto): Promise<ChatRoom> {
    const newRoom: NewChatRoom = {
      name: createChatRoomDto.name,
      description: createChatRoomDto.description,
      createdBy: userId,
    };

    const [room] = await this.db!.insert(ChatRoomSchema).values(newRoom).returning();

    return room;
  }

  public async getChatRooms(): Promise<ChatRoom[]> {
    return this.db!.select().from(ChatRoomSchema).orderBy(desc(ChatRoomSchema.createdAt));
  }

  public async getChatRoomById(roomId: string): Promise<ChatRoom | null> {
    const [room] = await this.db!.select().from(ChatRoomSchema).where(eq(ChatRoomSchema.id, roomId)).limit(1);

    return room || null;
  }

  public async deleteChatRoom(roomId: string, userId: string): Promise<boolean> {
    const result = await this.db!.delete(ChatRoomSchema)
      .where(and(eq(ChatRoomSchema.id, roomId), eq(ChatRoomSchema.createdBy, userId)))
      .returning();

    return result.length > 0;
  }

  // Message operations
  public async createMessage(userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    const newMessage: NewMessage = {
      content: createMessageDto.content,
      roomId: createMessageDto.roomId,
      senderId: userId,
      isRead: false,
    };

    const [message] = await this.db!.insert(MessageSchema).values(newMessage).returning();

    return message;
  }

  public async getMessagesByRoomId(roomId: string, limit = 50): Promise<Message[]> {
    return this.db!.select()
      .from(MessageSchema)
      .where(eq(MessageSchema.roomId, roomId))
      .orderBy(desc(MessageSchema.createdAt))
      .limit(limit);
  }

  public async markMessageAsRead(messageId: string): Promise<boolean> {
    const result = await this.db!.update(MessageSchema)
      .set({ isRead: true, updatedAt: new Date() })
      .where(eq(MessageSchema.id, messageId))
      .returning();

    return result.length > 0;
  }

  public async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await this.db!.delete(MessageSchema)
      .where(and(eq(MessageSchema.id, messageId), eq(MessageSchema.senderId, userId)))
      .returning();

    return result.length > 0;
  }

}
