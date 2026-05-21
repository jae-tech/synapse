import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AgentEvent } from '@synapse/schemas';
import { EventsService } from './events.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3010',
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => EventsService))
    private readonly service: EventsService,
  ) {}

  async handleConnection(client: Socket) {
    const workspaceId = (client.handshake.query['workspaceId'] as string) ?? 'default';
    const events = await this.service.getRecentEvents(workspaceId);
    client.emit('replay', events);
  }

  handleDisconnect(_client: Socket) {}

  broadcast(event: AgentEvent) {
    this.server.emit('agent_event', event);
  }
}
