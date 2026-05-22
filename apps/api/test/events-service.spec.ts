import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventsService } from '../src/events/events.service';
import { EventsGateway } from '../src/events/events.gateway';
import { DB_TOKEN } from '../src/db/index';
import type { Event } from '../src/db/schema';

const mockGateway = { broadcast: vi.fn() };

function makeRow(id: string, agentId: string, createdAt: Date): Event {
  return {
    id,
    agentId,
    type: 'tool_use',
    tool: null,
    payload: {},
    timestamp: createdAt,
    workspaceId: 'default',
    createdAt,
  };
}

function makeSelectChain(resolvedValue: Event[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn().mockResolvedValue(resolvedValue),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.orderBy.mockReturnValue(chain);
  return chain;
}

describe('EventsService.getRecentEvents', () => {
  let service: EventsService;
  let selectMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    selectMock = vi.fn();

    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
      select: selectMock,
    };

    const module = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: EventsGateway, useValue: mockGateway },
        { provide: DB_TOKEN, useValue: mockDb },
      ],
    }).compile();

    service = module.get(EventsService);
  });

  it('ORDER BY DESC LIMIT → ASC 역정렬 반환 (E2-2)', async () => {
    const old = makeRow('e1', 'backend', new Date('2026-01-01T00:00:00Z'));
    const mid = makeRow('e2', 'backend', new Date('2026-01-01T01:00:00Z'));
    const newest = makeRow('e3', 'backend', new Date('2026-01-01T02:00:00Z'));

    // DB는 DESC로 반환 (최신 → 오래된 순)
    selectMock.mockReturnValue(makeSelectChain([newest, mid, old]));

    const result = await service.getRecentEvents('default', 50);

    // DESC → reverse() → ASC: oldest가 result[0], newest가 result[2]
    expect(result[0].timestamp).toBe('2026-01-01T00:00:00.000Z');
    expect(result[2].timestamp).toBe('2026-01-01T02:00:00.000Z');
  });

  it('결과 timestamp ASC 정렬 보장', async () => {
    const old = makeRow('e1', 'backend', new Date('2026-01-01T00:00:00Z'));
    const mid = makeRow('e2', 'backend', new Date('2026-01-01T01:00:00Z'));
    const newest = makeRow('e3', 'backend', new Date('2026-01-01T02:00:00Z'));
    selectMock.mockReturnValue(makeSelectChain([newest, mid, old]));

    const result = await service.getRecentEvents();
    for (let i = 0; i < result.length - 1; i++) {
      expect(new Date(result[i].timestamp).getTime())
        .toBeLessThanOrEqual(new Date(result[i + 1].timestamp).getTime());
    }
  });

  it('DB 오류 시 빈 배열 fallback (critical gap 해결)', async () => {
    const failChain = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn().mockRejectedValue(new Error('DB timeout')),
    };
    failChain.from.mockReturnValue(failChain);
    failChain.where.mockReturnValue(failChain);
    failChain.orderBy.mockReturnValue(failChain);
    selectMock.mockReturnValue(failChain);

    const result = await service.getRecentEvents('default', 50);
    expect(result).toEqual([]);
  });
});
