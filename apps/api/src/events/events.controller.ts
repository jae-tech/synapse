import { Controller, Post, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { AgentEventSchema } from '@synapse/schemas';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Post()
  @HttpCode(204)
  ingest(@Body() body: unknown): void {
    const result = AgentEventSchema.safeParse(body);

    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((i) => ({ path: i.path, message: i.message })));
    }

    // 서버 수신 시각으로 timestamp 덮어쓰기 — 클라이언트 시계 신뢰 불필요
    this.service.ingest({ ...result.data, timestamp: new Date().toISOString() });
  }
}
