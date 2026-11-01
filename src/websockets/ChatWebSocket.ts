import type { AuthSession } from '@asenajs/asena/auth';
import { WebSocket } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { AsenaWebSocketService, type Socket } from '@asenajs/asena/web-socket';
import { isHttpException } from '@asenajs/asena/adapter';
import { AuthWebSocketMiddleware } from '@asenajs/asena-auth';
import type { AppUser } from '../auth/AppAuth';
import { ChatService } from '../services/ChatService';

/** Put on the socket by AuthWebSocketMiddleware during the handshake. */
interface ChatSocketData {
  authSession: AuthSession<AppUser>;
}

type ChatSocket = Socket<ChatSocketData>;

export interface WsUser {
  id: number;
  userName: string;
}

type ClientMessage =
  | { type: 'join'; roomId: number }
  | { type: 'leave'; roomId: number }
  | { type: 'message'; roomId: number; content: string }
  | { type: 'typing'; roomId: number };

const roomTopic = (roomId: number) => `room:${roomId}`;

/**
 * Real-time chat over the /chat-room namespace. Membership rules are enforced
 * by ChatService — 'join' registers the membership, so a 'message' from a
 * non-member is rejected there with a 403/404 that we relay as an error event.
 *
 * Authentication: @Protected does not apply to sockets — the namespace lists
 * asena-auth's AuthWebSocketMiddleware instead. It resolves the same session
 * as the REST API from the `bearer, <token>` subprotocol pair (browsers:
 * `new WebSocket(url, ['bearer', token])`), an Authorization header (server
 * clients) or the session cookie (same-origin pages), and answers 401 before
 * the upgrade when there is none.
 */
@WebSocket({ path: '/chat-room', middlewares: [AuthWebSocketMiddleware], name: 'ChatWebSocket' })
export class ChatWebSocket extends AsenaWebSocketService<ChatSocketData> {
  @Inject(ChatService)
  private chatService!: ChatService;

  protected onOpen(ws: ChatSocket): void {
    const user = socketUser(ws);

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Welcome to the chat!',
        userId: user.id,
        userName: user.userName,
      }),
    );
  }

  protected async onMessage(ws: ChatSocket, message: Buffer | string): Promise<void> {
    let data: ClientMessage;

    try {
      data = JSON.parse(message.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
      return;
    }

    const user = socketUser(ws);

    switch (data.type) {
      case 'join':
        return this.handleJoin(ws, user, data.roomId);
      case 'leave':
        return this.handleLeave(ws, user, data.roomId);
      case 'message':
        return this.handleMessage(ws, user, data.roomId, data.content);
      case 'typing':
        return this.handleTyping(ws, user, data.roomId);
      default:
        ws.send(JSON.stringify({ type: 'error', message: `Unknown message type` }));
    }
  }

  private async handleJoin(ws: ChatSocket, user: WsUser, roomId: number): Promise<void> {
    try {
      await this.chatService.joinRoom(user.id, roomId);
    } catch (error) {
      this.sendWsError(ws, roomId, error);
      return;
    }

    ws.subscribe(roomTopic(roomId));

    // this.to() includes the sender — the joiner gets a confirmation too.
    this.to(roomTopic(roomId), {
      type: 'joined',
      roomId,
      userId: user.id,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleLeave(ws: ChatSocket, user: WsUser, roomId: number): Promise<void> {
    try {
      await this.chatService.leaveRoom(user.id, roomId);
    } catch (error) {
      this.sendWsError(ws, roomId, error);
      return;
    }

    ws.unsubscribe(roomTopic(roomId));

    this.to(roomTopic(roomId), {
      type: 'left',
      roomId,
      userId: user.id,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleMessage(
    ws: ChatSocket,
    user: WsUser,
    roomId: number,
    content: string,
  ): Promise<void> {
    if (!ws.isSubscribed(roomTopic(roomId))) {
      ws.send(JSON.stringify({ type: 'error', roomId, message: 'Join the room before messaging' }));
      return;
    }

    let saved;

    try {
      saved = await this.chatService.createMessage(user.id, roomId, content);
    } catch (error) {
      this.sendWsError(ws, roomId, error);
      return;
    }

    this.to(roomTopic(roomId), {
      type: 'message',
      roomId,
      messageId: saved.id,
      content: saved.content,
      userId: user.id,
      userName: user.userName,
      timestamp: saved.createdAt.toISOString(),
    });
  }

  private handleTyping(ws: ChatSocket, user: WsUser, roomId: number): void {
    // No repository round-trip per keystroke — only subscribed (member) sockets
    // can receive room events anyway.
    if (!ws.isSubscribed(roomTopic(roomId))) {
      return;
    }

    this.to(roomTopic(roomId), {
      type: 'typing',
      roomId,
      userId: user.id,
      userName: user.userName,
      timestamp: new Date().toISOString(),
    });
  }

  /** Relays a domain error (404/403 HttpException) back to the offending socket. */
  private sendWsError(ws: ChatSocket, roomId: number, error: unknown): void {
    const message = isHttpException(error) ? extractMessage(error) : 'Failed to process message';

    ws.send(JSON.stringify({ type: 'error', roomId, message }));
  }
}

/** The session user with the numeric database id the services work with. */
function socketUser(ws: ChatSocket): WsUser {
  const { user } = ws.data.values.authSession;

  return { id: Number(user.id), userName: user.userName };
}

function extractMessage(error: unknown): string {
  const body = (error as { body?: string | object }).body;

  if (typeof body === 'string') {
    return body;
  }

  const message = (body as { message?: unknown } | undefined)?.message;

  return typeof message === 'string' ? message : 'Request failed';
}
