import { AsenaWebSocketService, type Socket, WebSocket } from '@asenajs/asena';
import { WSAuthMiddleware } from '../middleWare/auth/WSAuthMiddleware.ts';
import type { User } from '../core/entitiy/User.ts';

@WebSocket({ path: 'secret-chat', middlewares: [WSAuthMiddleware], name: 'TestWebSocket2' })
export class TestWebSocket2 extends AsenaWebSocketService<{ user: User }> {

  public onMessage(ws: Socket, message: Buffer | string) {
    console.log('WebSocket ' + ws.data.id + 'sent a  message:', message.toString());

    ws.publish('secret-chat', message.toString());
  }

  public onClose(ws: Socket<{ user: User }>, code: number, reason: string) {
    console.log('WebSocket closed');

    console.log('Code:', code);

    console.log('Reason:', reason);

    console.log(ws.data.id);
  }

  public onOpen(_ws: Socket) {
    console.log('WebSocket opened');
  }

}
