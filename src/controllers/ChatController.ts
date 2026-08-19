import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { ChatService } from '../services/ChatService';
import type { PublicUser } from '../services/UserService';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import {
  CreateChatRoomValidator,
  MessageIdValidator,
  RoomIdValidator,
  SendMessageValidator,
  type CreateChatRoomDto,
  type CreateMessageDto,
} from '../validators/ChatValidator';

@Controller({ path: '/chat', middlewares: [AuthMiddleware] })
export class ChatController {
  @Inject(ChatService)
  private chatService!: ChatService;

  // --- rooms ---

  @Post({ path: '/rooms', validator: CreateChatRoomValidator, description: 'Create a new chat room' })
  public async createRoom(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const dto = await context.getBody<CreateChatRoomDto>();
    const room = await this.chatService.createRoom(user.id, dto);

    return context.send({ success: true, message: 'Chat room created successfully', room }, 201);
  }

  @Get({ path: '/rooms', description: 'List all chat rooms (content requires membership)' })
  public async getRooms(context: Context) {
    return context.send({ success: true, rooms: await this.chatService.getRooms() }, 200);
  }

  @Get({ path: '/rooms/:id', validator: RoomIdValidator, description: 'Get a chat room (members only)' })
  public async getRoom(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const room = await this.chatService.getRoom(user.id, Number(context.getParam('id')));

    return context.send({ success: true, room }, 200);
  }

  @Delete({ path: '/rooms/:id', validator: RoomIdValidator, description: 'Delete a chat room (owner only)' })
  public async deleteRoom(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.chatService.deleteRoom(user.id, Number(context.getParam('id')));

    return context.send({ success: true, message: 'Chat room deleted successfully' }, 200);
  }

  @Post({ path: '/rooms/:id/join', validator: RoomIdValidator, description: 'Join a chat room' })
  public async joinRoom(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.chatService.joinRoom(user.id, Number(context.getParam('id')));

    return context.send({ success: true, message: 'Joined the chat room' }, 200);
  }

  @Post({ path: '/rooms/:id/leave', validator: RoomIdValidator, description: 'Leave a chat room (not the owner)' })
  public async leaveRoom(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.chatService.leaveRoom(user.id, Number(context.getParam('id')));

    return context.send({ success: true, message: 'Left the chat room' }, 200);
  }

  // --- messages ---

  @Post({
    path: '/rooms/:id/messages',
    validator: SendMessageValidator,
    description: 'Send a message to a room (members only)',
  })
  public async sendMessage(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const dto = await context.getBody<CreateMessageDto>();
    const message = await this.chatService.createMessage(
      user.id,
      Number(context.getParam('id')),
      dto.content,
    );

    return context.send({ success: true, message }, 201);
  }

  @Get({ path: '/rooms/:id/messages', validator: RoomIdValidator, description: 'List the messages of a room (members only)' })
  public async getMessages(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const limitParam = await context.getQuery('limit');
    const limit = limitParam ? Number(limitParam) : undefined;
    const messages = await this.chatService.getMessages(user.id, Number(context.getParam('id')), limit);

    return context.send({ success: true, messages }, 200);
  }

  @Post({ path: '/messages/:id/read', validator: MessageIdValidator, description: 'Mark a message as read' })
  public async markAsRead(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.chatService.markMessageAsRead(user.id, Number(context.getParam('id')));

    return context.send({ success: true, message: 'Message marked as read' }, 200);
  }

  @Delete({ path: '/messages/:id', validator: MessageIdValidator, description: 'Delete a message (sender only)' })
  public async deleteMessage(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.chatService.deleteMessage(user.id, Number(context.getParam('id')));

    return context.send({ success: true, message: 'Message deleted successfully' }, 200);
  }
}
