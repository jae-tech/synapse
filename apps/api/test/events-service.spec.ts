import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventsService } from '../src/events/events.service';
import { EventsGateway } from '../src/events/events.gateway';
import { EventEntity } from '../src/events/event.entity';

const mockGateway = { broadcast: vi.fn() };

function makeEntity(id: string, agentId: string, createdAt: Date): EventEntity {
  const e = new EventEntity();
  e.id = id;
  e.agentId = agentId;
  e.type = 'tool_use';
  e.tool = null;
  e.payload = {};
  e.timestamp = createdAt;
  e.workspaceId = 'default';
  e.createdAt = createdAt;
  return e;
}

describe('EventsService.getRecentEvents', () => {
  let service: EventsService;
  const findMock = vi.fn();

  const mockRepo = {
    create: vi.fn((data: unknown) => data),
    save: vi.fn().mockResolvedValue({}),
    find: findMock,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsGateway, useValue: mockGateway },
        { provide: getRepositoryToken(EventEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('ORDER BY DESC LIMIT → ASC 역정렬 반환 (E2-2)', async () => {
    // Regression: ISSUE-004 — getRecentEvents가 최신 N개를 ASC로 반환해야 함
    // Found by /qa on 2026-05-22
    // Report: .gstack/qa-reports/qa-report-feature-phase-2-postgresql-2026-05-22.md
    const old = makeEntity('e1', 'backend', new Date('2026-01-01T00:00:00Z'));
    const mid = makeEntity('e2', 'backend', new Date('2026-01-01T01:00:00Z'));
    const newest = makeEntity('e3', 'backend', new Date('2026-01-01T02:00:00Z'));

    // DB는 DESC로 반환 (최신 → 오래된 순)
    findMock.mockResolvedValue([newest, mid, old]);

    const result = await service.getRecentEvents('default', 50);

    // find가 DESC로 호출되었는지 확인
    expect(findMock).toHaveBeenCalledWith(
      expect.objectContaining({ order: { createdAt: 'DESC' } }),
    );

    // DESC → reverse() → ASC: oldest가 result[0], newest가 result[2]
    expect(result[0].timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(result[2].timestamp).toBe('2026-01-01T02:00:00.000Z');
  });

  it('결과 timestamp ASC 정렬 보장', async () => {
    const old = makeEntity('e1', 'backend', new Date('2026-01-01T00:00:00Z'));
    const mid = makeEntity('e2', 'backend', new Date('2026-01-01T01:00:00Z'));
    const newest = makeEntity('e3', 'backend', new Date('2026-01-01T02:00:00Z'));
    findMock.mockResolvedValue([newest, mid, old]);

    const result = await service.getRecentEvents();
    for (let i = 0; i < result.length - 1; i++) {
      expect(new Date(result[i].timestamp).getTime())
        .toBeLessThanOrEqual(new Date(result[i + 1].timestamp).getTime());
    }
  });
});
