import { WebSocket } from '@asenajs/asena/decorators';
import { AsenaWebSocketService, type Socket } from '@asenajs/asena/web-socket';

interface ClientEvent {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
}

/**
 * Public (unauthenticated) demo namespace: channel-based pub/sub with
 * subscribe/unsubscribe and a ping/pong heartbeat.
 */
@WebSocket({ path: '/notifications', name: 'NotificationWebSocket' })
export class NotificationWebSocket extends AsenaWebSocketService<Record<string, never>> {
  protected onOpen(ws: Socket<Record<string, never>>): void {
    ws.subscribe('general');

    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to the notification service',
        channels: ['general', 'system', 'updates', 'alerts'],
      }),
    );
  }

  protected onMessage(ws: Socket<Record<string, never>>, message: Buffer | string): void {
    let event: ClientEvent;

    try {
      event = JSON.parse(message.toString());
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
      return;
    }

    switch (event.type) {
      case 'subscribe':
        if (event.channel) {
          ws.subscribe(event.channel);
          ws.send(JSON.stringify({ type: 'subscribed', channel: event.channel }));
        }
        break;

      case 'unsubscribe':
        if (event.channel) {
          ws.unsubscribe(event.channel);
          ws.send(JSON.stringify({ type: 'unsubscribed', channel: event.channel }));
        }
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
    }
  }
}
