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
    const raw = client.handshake.query['workspaceId'];
    const workspaceId = (Array.isArray(raw) ? raw[0] : raw) ?? 'default';
    // 워크스페이스별 room에 가입 — 이벤트를 해당 워크스페이스 구독자에게만 전송
    await client.join(workspaceId);
    const events = await this.service.getRecentEvents(workspaceId);
    client.emit('replay', events);
  }

  handleDisconnect(_client: Socket) {}

  broadcast(event: AgentEvent) {
    // 해당 workspaceId room에만 broadcast — 다른 워크스페이스 클라이언트에게는 전송하지 않음
    this.server.to(event.workspaceId).emit('agent_event', event);
  }

  broadcastPty(workspaceId: string, agentId: string, data: string) {
    this.server.to(workspaceId).emit('pty:data', { agentId, data });
  }
}
