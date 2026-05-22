import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { AgentEvent } from '@synapse/schemas';
import { DB_TOKEN, DrizzleDb } from '@/db/index';
import { events } from '@/db/schema';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: DrizzleDb,
    private readonly gateway: EventsGateway,
  ) {}

  async ingest(event: AgentEvent): Promise<void> {
    try {
      await this.db.insert(events).values({
        id: event.id,
        agentId: event.agentId,
        type: event.type,
        tool: event.tool ?? null,
        payload: event.payload as Record<string, unknown>,
        timestamp: new Date(event.timestamp),
        workspaceId: event.workspaceId,
      });
    } catch (err) {
      throw new ServiceUnavailableException('DB save failed');
    }

    this.gateway.broadcast(event);
  }

  async getRecentEvents(workspaceId = 'default', limit = 50): Promise<AgentEvent[]> {
    let rows: (typeof events.$inferSelect)[];

    try {
      rows = await this.db
        .select()
        .from(events)
        .where(eq(events.workspaceId, workspaceId))
        .orderBy(desc(events.createdAt))
        .limit(limit);
    } catch (err) {
      // DB 장애 시 빈 배열 fallback — WebSocket replay는 빈 상태로 시작 (E2-2)
      this.logger.error('getRecentEvents failed, returning empty replay', err);
      return [];
    }

    // DESC로 최신 N개를 먼저 가져온 뒤 ASC로 역정렬하여 replay 순서 보정 (E2-2)
    rows.reverse();

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
