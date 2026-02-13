import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { NotificationActivityRecord } from './notification-activity.service';

export interface NotificationSocketEvent {
  event: 'notification.connected' | 'notification.activity';
  timestamp: string;
  payload: unknown;
}

@Injectable()
export class NotificationsRealtimeService {
  private readonly logger = new Logger(NotificationsRealtimeService.name);
  private readonly clients = new Set<WebSocket>();
  private serverReady = false;

  attachServer(server: WebSocketServer): void {
    if (this.serverReady) {
      return;
    }

    server.on('connection', (socket: WebSocket, req: IncomingMessage) => {
      this.clients.add(socket);
      this.logger.log(
        `WebSocket client connected (${this.clients.size} total) from ${req.socket.remoteAddress ?? 'unknown'}`,
      );

      socket.send(
        JSON.stringify({
          event: 'notification.connected',
          timestamp: new Date().toISOString(),
          payload: { connectedClients: this.clients.size },
        } satisfies NotificationSocketEvent),
      );

      socket.on('close', () => {
        this.clients.delete(socket);
        this.logger.log(`WebSocket client disconnected (${this.clients.size} total)`);
      });

      socket.on('error', (error) => {
        this.logger.error(`WebSocket client error: ${error.message}`);
      });
    });

    server.on('error', (error) => {
      this.logger.error(`WebSocket server error: ${error.message}`);
    });

    this.serverReady = true;
    this.logger.log('Notification WebSocket server attached');
  }

  publishActivity(activity: NotificationActivityRecord): void {
    this.broadcast({
      event: 'notification.activity',
      timestamp: new Date().toISOString(),
      payload: activity,
    });
  }

  getRealtimeStats() {
    return {
      serverReady: this.serverReady,
      connectedClients: this.clients.size,
    };
  }

  private broadcast(event: NotificationSocketEvent): void {
    if (!this.serverReady || this.clients.size === 0) {
      return;
    }

    const message = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}
