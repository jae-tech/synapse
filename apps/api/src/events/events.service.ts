import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentEvent } from '@synapse/schemas';
import { EventEntity } from './event.entity';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
    private readonly gateway: EventsGateway,
  ) {}

  async ingest(event: AgentEvent): Promise<void> {
    const entity = this.repo.create({
      id: event.id,
      agentId: event.agentId,
      type: event.type,
      tool: event.tool ?? null,
      payload: event.payload as Record<string, unknown>,
      timestamp: new Date(event.timestamp),
      workspaceId: event.workspaceId,
    });

    try {
      await this.repo.save(entity);
    } catch (err) {
      throw new ServiceUnavailableException('DB save failed');
    }

    this.gateway.broadcast(event);
  }

  async getRecentEvents(workspaceId = 'default', limit = 50): Promise<AgentEvent[]> {
    const rows = await this.repo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return rows.map((row) => ({
      id: row.id,
      agentId: row.agentId,
      type: row.type as AgentEvent['type'],
      tool: row.tool ?? undefined,
      payload: row.payload as AgentEvent['payload'],
      timestamp: row.timestamp.toISOString(),
      workspaceId: row.workspaceId,
    }));
  }
}
