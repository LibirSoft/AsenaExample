import { Service } from '@asenajs/asena/decorators';
import { Inject, Value } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { Transaction } from '@asenajs/asena-drizzle';
import { chatRooms } from '../database/schemas/chat-room.schema';
import { messages } from '../database/schemas/message.schema';
import { ChatRepository } from '../repositories/ChatRepository';
import type { CreateChatRoomDto } from '../validators/ChatValidator';

export type ChatRoomRow = typeof chatRooms.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;

/**
 * Chat domain rules: rooms are discoverable by everyone but readable/writable
 * only by their members; the creator is the owner; ownership and membership
 * checks (404 missing / 403 forbidden) live here, never in the controller.
 */
@Service()
export class ChatService {
  @Inject('ChatRepository')
  private chatRepository!: ChatRepository;

  /**
   * Configuration injected like a collaborator: read from process.env when the
   * container builds the service. `parse` runs on the raw string; with a
   * `default` an unset variable is fine (without one the boot would stop).
   */
  @Value('CHAT_MAX_PAGE_SIZE', { parse: Number, default: 100 })
  private maxPageSize!: number;

  /**
   * Creates the room and the creator's membership atomically — both inserts
   * join one transaction through AsyncLocalStorage.
   */
  @Transaction()
  public async createRoom(userId: number, dto: CreateChatRoomDto): Promise<ChatRoomRow> {
    const room = await this.chatRepository.create({
      name: dto.name,
      description: dto.description,
      createdBy: userId,
    });

    await this.chatRepository.insertMember(room.id, userId);

    return room;
  }

  /** Rooms are public to browse; their content is not. */
  public getRooms() {
    return this.chatRepository.findAllRooms();
  }

  public async getRoom(userId: number, roomId: number): Promise<ChatRoomRow> {
    const room = await this.getExistingRoom(roomId);
    await this.assertMember(roomId, userId);
    return room;
  }

  public async deleteRoom(userId: number, roomId: number): Promise<void> {
    const room = await this.getExistingRoom(roomId);

    if (room.createdBy !== userId) {
      throw new HttpException(403, { success: false, message: 'Only the room owner can delete it' });
    }

    // Memberships and messages disappear with the room via ON DELETE CASCADE.
    await this.chatRepository.deleteById(roomId);
  }

  /** Joining is open to any authenticated user and idempotent. */
  public async joinRoom(userId: number, roomId: number): Promise<void> {
    await this.getExistingRoom(roomId);
    await this.chatRepository.insertMember(roomId, userId);
  }

  public async leaveRoom(userId: number, roomId: number): Promise<void> {
    const room = await this.getExistingRoom(roomId);

    if (room.createdBy === userId) {
      throw new HttpException(403, {
        success: false,
        message: 'The room owner cannot leave; delete the room instead',
      });
    }

    await this.chatRepository.deleteMember(roomId, userId);
  }

  public async createMessage(userId: number, roomId: number, content: string): Promise<MessageRow> {
    await this.getExistingRoom(roomId);
    await this.assertMember(roomId, userId);
    return this.chatRepository.createMessage({ roomId, senderId: userId, content });
  }

  public async getMessages(userId: number, roomId: number, limit?: number): Promise<MessageRow[]> {
    await this.getExistingRoom(roomId);
    await this.assertMember(roomId, userId);

    const pageSize = Math.min(Math.max(Math.trunc(limit ?? 50), 1), this.maxPageSize);
    return this.chatRepository.findMessagesByRoomId(roomId, pageSize);
  }

  public async markMessageAsRead(userId: number, messageId: number): Promise<void> {
    const message = await this.getExistingMessage(messageId);
    await this.assertMember(message.roomId, userId);
    await this.chatRepository.markMessageAsRead(messageId);
  }

  public async deleteMessage(userId: number, messageId: number): Promise<void> {
    const message = await this.getExistingMessage(messageId);

    if (message.senderId !== userId) {
      throw new HttpException(403, { success: false, message: 'Only the sender can delete a message' });
    }

    await this.chatRepository.deleteMessageById(messageId);
  }

  private async getExistingRoom(roomId: number): Promise<ChatRoomRow> {
    const room = await this.chatRepository.findRoomById(roomId);

    if (!room) {
      throw new HttpException(404, { success: false, message: `Chat room ${roomId} not found` });
    }

    return room;
  }

  private async getExistingMessage(messageId: number): Promise<MessageRow> {
    const message = await this.chatRepository.findMessageById(messageId);

    if (!message) {
      throw new HttpException(404, { success: false, message: `Message ${messageId} not found` });
    }

    return message;
  }

  private async assertMember(roomId: number, userId: number): Promise<void> {
    if (!(await this.chatRepository.findMember(roomId, userId))) {
      throw new HttpException(403, {
        success: false,
        message: `User ${userId} is not a member of chat room ${roomId}`,
      });
    }
  }
}
