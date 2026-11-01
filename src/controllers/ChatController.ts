import { Protected } from '@asenajs/asena/auth';
import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { currentUser } from '../auth/currentUser';
import { ChatService } from '../services/ChatService';
import {
  CreateChatRoomValidator,
  ListMessagesContext,
  MessageIdContext,
  RoomIdContext,
  SendMessageValidator,
  type CreateChatRoomDto,
  type CreateMessageDto,
} from '../validators/ChatValidator';

/** Every chat route requires a session; membership rules live in ChatService. */
@Protected()
@Controller('/chat')
export class ChatController {
  @Inject(ChatService)
  private chatService!: ChatService;

  // --- rooms ---

  @Post({ path: '/rooms', validator: CreateChatRoomValidator, description: 'Create a new chat room' })
  public async createRoom(context: Context) {
    const user = currentUser(context);
    const dto = await context.getBody<CreateChatRoomDto>();
    const room = await this.chatService.createRoom(user.id, dto);

    return context.send({ success: true, message: 'Chat room created successfully', room }, 201);
  }

  @Get({ path: '/rooms', description: 'List all chat rooms (content requires membership)' })
  public async getRooms(context: Context) {
    return context.send({ success: true, rooms: await this.chatService.getRooms() }, 200);
  }

  @Get({ path: '/rooms/:id', description: 'Get a chat room (members only)' })
  public async getRoom(context: RoomIdContext) {
    const user = currentUser(context);
    const room = await this.chatService.getRoom(user.id, context.input.params.id);

    return context.send({ success: true, room }, 200);
  }

  @Delete({ path: '/rooms/:id', description: 'Delete a chat room (owner only)' })
  public async deleteRoom(context: RoomIdContext) {
    const user = currentUser(context);
    await this.chatService.deleteRoom(user.id, context.input.params.id);

    return context.send({ success: true, message: 'Chat room deleted successfully' }, 200);
  }

  @Post({ path: '/rooms/:id/join', description: 'Join a chat room' })
  public async joinRoom(context: RoomIdContext) {
    const user = currentUser(context);
    await this.chatService.joinRoom(user.id, context.input.params.id);

    return context.send({ success: true, message: 'Joined the chat room' }, 200);
  }

  @Post({ path: '/rooms/:id/leave', description: 'Leave a chat room (not the owner)' })
  public async leaveRoom(context: RoomIdContext) {
    const user = currentUser(context);
    await this.chatService.leaveRoom(user.id, context.input.params.id);

    return context.send({ success: true, message: 'Left the chat room' }, 200);
  }

  // --- messages ---

  @Post({
    path: '/rooms/:id/messages',
    validator: SendMessageValidator,
    description: 'Send a message to a room (members only)',
  })
  public async sendMessage(context: Context) {
    const user = currentUser(context);
    const dto = await context.getBody<CreateMessageDto>();
    const message = await this.chatService.createMessage(
      user.id,
      Number(context.getParam('id')),
      dto.content,
    );

    return context.send({ success: true, message }, 201);
  }

  @Get({ path: '/rooms/:id/messages', description: 'List the messages of a room (members only)' })
  public async getMessages(context: ListMessagesContext) {
    const user = currentUser(context);
    const { params, query } = context.input;
    const messages = await this.chatService.getMessages(user.id, params.id, query.limit);

    return context.send({ success: true, messages }, 200);
  }

  @Post({ path: '/messages/:id/read', description: 'Mark a message as read' })
  public async markAsRead(context: MessageIdContext) {
    const user = currentUser(context);
    await this.chatService.markMessageAsRead(user.id, context.input.params.id);

    return context.send({ success: true, message: 'Message marked as read' }, 200);
  }

  @Delete({ path: '/messages/:id', description: 'Delete a message (sender only)' })
  public async deleteMessage(context: MessageIdContext) {
    const user = currentUser(context);
    await this.chatService.deleteMessage(user.id, context.input.params.id);

    return context.send({ success: true, message: 'Message deleted successfully' }, 200);
  }
}
