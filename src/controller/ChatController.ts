import { Controller } from '@asenajs/asena/server';
import { Delete, Get, Post } from '@asenajs/asena/web';
import { Inject } from '@asenajs/asena/ioc';
import { ClientErrorStatusCode, SuccessStatusCode } from '@asenajs/asena/web-types';
import type { Context } from '@asenajs/hono-adapter';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import type { ChatService } from '../core/service/ChatService.ts';
import type { User } from '../core/schemas/User.ts';
import type { CreateChatRoomDto, CreateMessageDto } from '../core/repository/ChatRepository.ts';
import { CreateChatRoomValidator } from '../middleWare/validator/CreateChatRoomValidator.ts';
import { CreateMessageValidator } from '../middleWare/validator/CreateMessageValidator.ts';

@Controller({ path: '/chat', name: 'ChatController', middlewares: [AuthMiddleware] })
export class ChatController {

  @Inject('ChatService')
  private chatService: ChatService;

  // Chat Room endpoints
  @Post({ path: '/rooms', validator: CreateChatRoomValidator, description: 'Create a new chat room' })
  public async createRoom(context: Context) {
    const user = context.getValue<User>('user');
    const body = await context.getBody<CreateChatRoomDto>();

    try {
      const room = await this.chatService.createChatRoom(user.id, body);

      return context.send({ success: true, data: room }, SuccessStatusCode.Created);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to create chat room' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Get({ path: '/rooms', description: 'Get all chat rooms' })
  public async getRooms(context: Context) {
    try {
      const rooms = await this.chatService.getChatRooms();

      return context.send({ success: true, data: rooms }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to fetch chat rooms' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Get({ path: '/rooms/:id', description: 'Get a chat room by id' })
  public async getRoom(context: Context) {
    const id = context.getParam('id');

    try {
      const room = await this.chatService.getChatRoomById(id);

      if (!room) {
        return context.send({ success: false, message: 'Chat room not found' }, ClientErrorStatusCode.NotFound);
      }

      return context.send({ success: true, data: room }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to fetch chat room' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Delete({ path: '/rooms/:id', description: 'Delete a chat room' })
  public async deleteRoom(context: Context) {
    const id = context.getParam('id');
    const user = context.getValue<User>('user');

    try {
      const deleted = await this.chatService.deleteChatRoom(id, user.id);

      if (!deleted) {
        return context.send(
          { success: false, message: 'Chat room not found or unauthorized' },
          ClientErrorStatusCode.Forbidden,
        );
      }

      return context.send({ success: true, message: 'Chat room deleted successfully' }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to delete chat room' }, ClientErrorStatusCode.BadRequest);
    }
  }

  // Message endpoints
  @Post({ path: '/messages', validator: CreateMessageValidator, description: 'Send a message to a room' })
  public async sendMessage(context: Context) {
    const user = context.getValue<User>('user');
    const body = await context.getBody<CreateMessageDto>();

    try {
      const message = await this.chatService.createMessage(user.id, body);

      return context.send({ success: true, data: message }, SuccessStatusCode.Created);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to send message' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Get({ path: '/rooms/:id/messages', description: 'Get messages from a room' })
  public async getMessages(context: Context) {
    const roomId = context.getParam('id');
    const limit = await context.getQuery('limit');

    try {
      const messages = await this.chatService.getMessagesByRoomId(roomId, limit ? parseInt(limit, 10) : 50);

      return context.send({ success: true, data: messages }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to fetch messages' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Post({ path: '/messages/:id/read', description: 'Mark a message as read' })
  public async markAsRead(context: Context) {
    const messageId = context.getParam('id');

    try {
      const marked = await this.chatService.markMessageAsRead(messageId);

      if (!marked) {
        return context.send({ success: false, message: 'Message not found' }, ClientErrorStatusCode.NotFound);
      }

      return context.send({ success: true, message: 'Message marked as read' }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send(
        { success: false, message: 'Failed to mark message as read' },
        ClientErrorStatusCode.BadRequest,
      );
    }
  }

  @Delete({ path: '/messages/:id', description: 'Delete a message' })
  public async deleteMessage(context: Context) {
    const messageId = context.getParam('id');
    const user = context.getValue<User>('user');

    try {
      const deleted = await this.chatService.deleteMessage(messageId, user.id);

      if (!deleted) {
        return context.send(
          { success: false, message: 'Message not found or unauthorized' },
          ClientErrorStatusCode.Forbidden,
        );
      }

      return context.send({ success: true, message: 'Message deleted successfully' }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to delete message' }, ClientErrorStatusCode.BadRequest);
    }
  }

}
