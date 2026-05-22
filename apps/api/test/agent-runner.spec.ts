import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { AgentRunnerService } from '@/agents/agent-runner.service';
import { EventsService } from '@/events/events.service';
import type { AgentResult } from '@/agents/adapters/agent-adapter.interface';
import { ClaudeAdapter } from '@/agents/adapters/claude.adapter';

const mockAdapter = {
  name: 'claude' as const,
  run: vi.fn(),
  isAvailable: vi.fn().mockResolvedValue(true),
} as unknown as ClaudeAdapter;

const mockEventsService = {
  ingest: vi.fn().mockResolvedValue(undefined),
};

async function buildService() {
  const module = await Test.createTestingModule({
    providers: [
      AgentRunnerService,
      { provide: EventsService, useValue: mockEventsService },
      // AgentAdapter는 인터페이스이므로 직접 useValue로 주입
      { provide: 'AgentAdapter', useValue: mockAdapter },
    ],
  })
    .overrideProvider(AgentRunnerService)
    .useFactory({
      factory: () => new AgentRunnerService(mockAdapter, mockEventsService as any),
    })
    .compile();

  return module.get(AgentRunnerService);
}

describe('AgentRunnerService', () => {
  let service: AgentRunnerService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await buildService();
  });

  it('run 시작 시 agent:start 이벤트를 즉시 ingest한다', async () => {
    const result: AgentResult = { stdout: 'ok', exitCode: 0, durationMs: 100 };
    vi.mocked(mockAdapter.run).mockResolvedValue(result);

    await service.run({
      agentId: 'backend',
      workspaceId: 'default',
      prompt: 'test',
    });

    const firstCall = vi.mocked(mockEventsService.ingest).mock.calls[0][0];
    expect(firstCall.type).toBe('agent:start');
    expect(firstCall.agentId).toBe('backend');
    expect(firstCall.workspaceId).toBe('default');
  });

  it('성공 시 agent:complete 이벤트를 ingest하고 AgentResult를 반환한다', async () => {
    const result: AgentResult = { stdout: 'done', exitCode: 0, durationMs: 200 };
    vi.mocked(mockAdapter.run).mockResolvedValue(result);

    const returned = await service.run({
      agentId: 'backend',
      workspaceId: 'default',
      prompt: 'hello',
    });

    expect(returned).toEqual(result);

    const calls = vi.mocked(mockEventsService.ingest).mock.calls;
    const completeEvent = calls[calls.length - 1][0];
    expect(completeEvent.type).toBe('agent:complete');
    expect(completeEvent.payload).toMatchObject({ exitCode: 0 });
  });

  it('exitCode 비0이면 agent:error 이벤트를 ingest한다', async () => {
    const result: AgentResult = { stdout: '', exitCode: 1, durationMs: 50 };
    vi.mocked(mockAdapter.run).mockResolvedValue(result);

    await service.run({
      agentId: 'backend',
      workspaceId: 'default',
      prompt: 'fail case',
    });

    const calls = vi.mocked(mockEventsService.ingest).mock.calls;
    const lastEvent = calls[calls.length - 1][0];
    expect(lastEvent.type).toBe('agent:error');
    expect(lastEvent.payload).toMatchObject({ exitCode: 1 });
  });

  it('adapter.run 예외 시 agent:error 이벤트를 ingest하고 re-throw한다', async () => {
    vi.mocked(mockAdapter.run).mockRejectedValue(new Error('pty crash'));

    await expect(
      service.run({ agentId: 'backend', workspaceId: 'default', prompt: 'crash' }),
    ).rejects.toThrow('pty crash');

    const calls = vi.mocked(mockEventsService.ingest).mock.calls;
    const errorEvent = calls[calls.length - 1][0];
    expect(errorEvent.type).toBe('agent:error');
  });

  it('onPtyData 콜백이 adapter의 PTY 청크를 relay받는다', async () => {
    let capturedCallback: ((chunk: string) => void) | undefined;

    vi.mocked(mockAdapter.run).mockImplementation(async (_prompt, options) => {
      capturedCallback = options.onPtyData;
      return { stdout: 'a', exitCode: 0, durationMs: 10 };
    });

    const received: string[] = [];
    await service.run({
      agentId: 'backend',
      workspaceId: 'default',
      prompt: 'stream',
      onPtyData: (chunk) => received.push(chunk),
    });

    // adapter가 실행 중 청크를 emit했을 것을 시뮬레이션
    capturedCallback?.('chunk1');
    capturedCallback?.('chunk2');

    expect(received).toEqual(['chunk1', 'chunk2']);
  });
});
