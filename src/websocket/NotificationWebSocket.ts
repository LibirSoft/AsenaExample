import { WebSocket } from '@asenajs/asena/server';
import { AsenaWebSocketService, type Socket } from '@asenajs/asena/web-socket';

interface NotificationData {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  channel?: string;
}

/**
 * NotificationWebSocket - Public WebSocket for broadcasting notifications
 *
 * Features demonstrated:
 * - No authentication required (public access)
 * - Pub/Sub pattern for broadcasting
 * - Channel-based subscriptions
 * - Real-time notifications
 */
@WebSocket({ path: 'notifications', name: 'NotificationWebSocket' })
export class NotificationWebSocket extends AsenaWebSocketService<Record<string, unknown>> {

  private static connectedClients = 0;

  public onMessage(ws: Socket<Record<string, unknown>>, message: Buffer | string): void {
    try {
      const data: NotificationData = JSON.parse(message.toString());

      console.log(`[NotificationWebSocket] Received message type: ${data.type}`);

      switch (data.type) {
        case 'subscribe':
          if (data.channel) {
            ws.subscribe(data.channel);

            ws.send(
              JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                message: `Successfully subscribed to ${data.channel}`,
                timestamp: new Date().toISOString(),
              }),
            );

            console.log(`[NotificationWebSocket] Client subscribed to channel: ${data.channel}`);
          }

          break;

        case 'unsubscribe':
          if (data.channel) {
            ws.unsubscribe(data.channel);

            ws.send(
              JSON.stringify({
                type: 'unsubscribed',
                channel: data.channel,
                message: `Successfully unsubscribed from ${data.channel}`,
                timestamp: new Date().toISOString(),
              }),
            );

            console.log(`[NotificationWebSocket] Client unsubscribed from channel: ${data.channel}`);
          }

          break;

        case 'ping':
          ws.send(
            JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString(),
            }),
          );

          break;

        default:
          console.log(`[NotificationWebSocket] Unknown message type: ${data.type}`);
      }
    } catch (e) {
      console.error('[NotificationWebSocket] Error processing message:', e);

      ws.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to process message',
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }

  public onClose(_ws: Socket<Record<string, unknown>>, code: number, reason: string): void {
    NotificationWebSocket.connectedClients--;

    console.log(`[NotificationWebSocket] Client disconnected. Code: ${code}, Reason: ${reason}`);

    console.log(`[NotificationWebSocket] Active connections: ${NotificationWebSocket.connectedClients}`);
  }

  public onOpen(ws: Socket<Record<string, unknown>>): void {
    NotificationWebSocket.connectedClients++;

    console.log(`[NotificationWebSocket] New client connected`);

    console.log(`[NotificationWebSocket] Active connections: ${NotificationWebSocket.connectedClients}`);

    // Subscribe to general notifications by default
    ws.subscribe('general');

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Connected to notification service',
        availableChannels: ['general', 'system', 'updates', 'alerts'],
        timestamp: new Date().toISOString(),
      }),
    );

    // Send a welcome notification to the general channel
    ws.publish(
      'general',
      JSON.stringify({
        type: 'notification',
        title: 'New Connection',
        message: 'A new client has connected to the notification service',
        severity: 'info',
        timestamp: new Date().toISOString(),
      }),
    );
  }

  public onDrain(_ws: Socket<Record<string, unknown>>): void {
    console.log('[NotificationWebSocket] Drain event triggered');
  }

}
