import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { AgentEvent } from "@synapse/schemas";

// D6: 환경변수로 replay buffer 크기 설정, 최대 500으로 상한
const REPLAY_BUFFER_SIZE = Math.min(parseInt(process.env.REPLAY_BUFFER_SIZE ?? "50", 10), 500);

// D3: 환경변수로 CORS origin 설정
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3010",
  },
  transports: ["websocket", "polling"],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private recentEvents: AgentEvent[] = [];

  handleConnection(client: Socket) {
    // 재연결 시 최근 이벤트 replay
    client.emit("replay", this.recentEvents);
  }

  handleDisconnect(_client: Socket) {}

  broadcast(event: AgentEvent) {
    this.recentEvents.push(event);
    if (this.recentEvents.length > REPLAY_BUFFER_SIZE) {
      this.recentEvents.shift();
    }
    this.server.emit("agent_event", event);
  }

  getRecentEvents(): AgentEvent[] {
    return this.recentEvents;
  }
}
