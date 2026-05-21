import { Injectable } from '@nestjs/common';
import { AgentEvent } from '@synapse/schemas';
import { EventsGateway } from './events.gateway';

// D2: Controller → Service → Gateway 흐름
@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  ingest(event: AgentEvent): void {
    this.gateway.broadcast(event);
  }

  getRecentEvents(): AgentEvent[] {
    return this.gateway.getRecentEvents();
  }
}
