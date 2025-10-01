import { WebSocket } from '@asenajs/asena/server';
import { AsenaWebSocketService, type Socket } from '@asenajs/asena/web-socket';
import { WSAuthMiddleware } from '../middleWare/auth/WSAuthMiddleware.ts';
import { Inject } from '@asenajs/asena/ioc';
import type { ChatService } from '../core/service/ChatService.ts';

interface UserData {
  name: string;
  id: string;
  email: string;
}

interface ChatMessage {
  type: 'message' | 'join' | 'leave' | 'typing';
  content?: string;
  roomId: string;
  userName?: string;
  timestamp?: string;
}

@WebSocket({ path: 'chat-room', middlewares: [WSAuthMiddleware], name: 'ChatWebSocket' })
export class ChatWebSocket extends AsenaWebSocketService<{ user: UserData }> {

  @Inject('ChatService')
  private chatService: ChatService;

  public async onMessage(ws: Socket<{ user: UserData }>, message: Buffer | string): Promise<void> {
    try {
      const data: ChatMessage = JSON.parse(message.toString());

      if (!ws.data || !ws.data.values.user) {
        ws.send(JSON.stringify({ type: 'error', message: 'User data not found' }));

        return;
      }

      const user = ws.data.values.user;

      console.log(`[ChatWebSocket] User ${user.name} sent message to room ${data.roomId}`);

      switch (data.type) {
        case 'message':
          if (data.content) {
            // Save message to database
            const savedMessage = await this.chatService.createMessage(user.id, {
              content: data.content,
              roomId: data.roomId,
            });

            // Broadcast to room
            const broadcastData = {
              type: 'message',
              content: data.content,
              roomId: data.roomId,
              userName: user.name,
              userId: user.id,
              messageId: savedMessage.id,
              timestamp: new Date().toISOString(),
            };

            ws.publish(`chat-room-${data.roomId}`, JSON.stringify(broadcastData));
          }

          break;

        case 'typing':
          ws.publish(
            `chat-room-${data.roomId}`,
            JSON.stringify({
              type: 'typing',
              roomId: data.roomId,
              userName: user.name,
              userId: user.id,
              timestamp: new Date().toISOString(),
            }),
          );

          break;

        default:
          console.log(`[ChatWebSocket] Unknown message type: ${data.type}`);
      }
    } catch (e) {
      console.error('[ChatWebSocket] Error processing message:', e);

      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
        }),
      );
    }
  }

  public onClose(ws: Socket<{ user: UserData }>, code: number, reason: string): void {
    console.log(`[ChatWebSocket] Connection closed. Code: ${code}, Reason: ${reason}`);

    if (ws.data && ws.data.values.user) {
      const user = ws.data.values.user;

      console.log(`[ChatWebSocket] User ${user.name} disconnected`);
    }

    // Notify all subscribed rooms about user leaving
    // In a real app, you would track which rooms the user was in
  }

  public onOpen(ws: Socket<{ user: UserData }>): void {
    if (!ws.data || !ws.data.values.user) {
      console.error('[ChatWebSocket] User data not found on connection');

      ws.close(1008, 'User data not found');

      return;
    }

    const user = ws.data.values.user;

    console.log(`[ChatWebSocket] User ${user.name} connected`);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Welcome to the chat!',
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  public onDrain(ws: Socket<{ user: UserData }>): void {
    if (ws.data && ws.data.values.user) {
      console.log(`[ChatWebSocket] Drain event for user ${ws.data.values.user.name}`);
    } else {
      console.log('[ChatWebSocket] Drain event');
    }
  }

}
