import type { User } from '../core/entitiy/User.ts';
import { AsenaWebSocketService, type Socket, WebSocket } from '@asenajs/asena';

@WebSocket({ path: 'chat', middlewares: [], name: 'TestWebSocket' })
export class TestWebSocket extends AsenaWebSocketService<{ user: User }> {

  public onMessage(ws: Socket, message: Buffer | string) {
    console.log('WebSocket sent a message:', message.toString());

    ws.publishText('room', message.toString());

    console.log('Message published to room');
  }

  public onClose(ws: Socket, code: number, reason: string) {
    console.log('WebSocket closed');

    console.log('Code:', code);

    console.log('Reason:', reason);

    console.log(ws.data ? ws.data.id : 'No data');
  }

  public onOpen(ws: Socket) {
    console.log('websocket opened');

    ws.subscribe('room');
  }

}
