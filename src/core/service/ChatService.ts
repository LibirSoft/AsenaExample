import { Service } from '@asenajs/asena/server';
import { Inject } from '@asenajs/asena/ioc';
import type { ChatRepository, CreateChatRoomDto, CreateMessageDto } from '../repository/ChatRepository.ts';
import type { ChatRoom, Message } from '../schemas/Chat.ts';

@Service("ChatService")
export class ChatService {

  @Inject('ChatRepository')
  private chatRepository: ChatRepository;

  // Chat Room methods
  public async createChatRoom(userId: string, createChatRoomDto: CreateChatRoomDto): Promise<ChatRoom> {
    return await this.chatRepository.createChatRoom(userId, createChatRoomDto);
  }

  public async getChatRooms(): Promise<ChatRoom[]> {
    return await this.chatRepository.getChatRooms();
  }

  public async getChatRoomById(roomId: string): Promise<ChatRoom | null> {
    return await this.chatRepository.getChatRoomById(roomId);
  }

  public async deleteChatRoom(roomId: string, userId: string): Promise<boolean> {
    return await this.chatRepository.deleteChatRoom(roomId, userId);
  }

  // Message methods
  public async createMessage(userId: string, createMessageDto: CreateMessageDto): Promise<Message> {
    return await this.chatRepository.createMessage(userId, createMessageDto);
  }

  public async getMessagesByRoomId(roomId: string, limit?: number): Promise<Message[]> {
    return await this.chatRepository.getMessagesByRoomId(roomId, limit);
  }

  public async markMessageAsRead(messageId: string): Promise<boolean> {
    return await this.chatRepository.markMessageAsRead(messageId);
  }

  public async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    return await this.chatRepository.deleteMessage(messageId, userId);
  }

}
