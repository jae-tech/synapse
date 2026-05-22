import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { OrchestratorService } from '@/orchestrator/orchestrator.service';
import { AgentRunnerService } from '@/agents/agent-runner.service';
import { EventsService } from '@/events/events.service';
import type { AgentResult } from '@/agents/adapters/agent-adapter.interface';
import type { Task } from '@/db/schema';

const TASK_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: TASK_ID,
    issue: '로그인 기능 구현',
    workspaceId: 'default',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Task;
}

// PM이 반환할 서브태스크 JSON
const PM_SUBTASKS = [
  { role: 'backend', prompt: 'JWT 인증 API 구현' },
  { role: 'frontend', prompt: '로그인 폼 UI 구현' },
];

// ClaudeAdapter mock 없이 AgentRunnerService를 직접 mock
const mockRunner = {
  run: vi.fn<typeof AgentRunnerService.prototype.run>(),
};

const mockEventsService = {
  ingest: vi.fn().mockResolvedValue(undefined),
};

async function buildService() {
  const module = await Test.createTestingModule({
    providers: [
      OrchestratorService,
      { provide: AgentRunnerService, useValue: mockRunner },
      { provide: EventsService, useValue: mockEventsService },
    ],
  }).compile();

  return module.get(OrchestratorService);
}

// PM 응답 시뮬레이션 헬퍼 — onPtyData 콜백으로 PTY 청크를 주입하고 결과 반환
function simulatePmRun(output: string): AgentResult {
  mockRunner.run.mockImplementationOnce(async (req) => {
    req.onPtyData?.(output);
    return { stdout: output, exitCode: 0, durationMs: 100 };
  });
  return { stdout: output, exitCode: 0, durationMs: 100 };
}

describe('OrchestratorService — PM → 서브태스크 파견 흐름', () => {
  let service: OrchestratorService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await buildService();
  });

  it('PM이 JSON 배열을 반환하면 서브태스크 수만큼 runner.run이 추가 호출된다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));

    // 서브태스크 실행은 성공 처리
    mockRunner.run.mockResolvedValue({ stdout: 'done', exitCode: 0, durationMs: 200 });

    await service.dispatch(makeTask());

    // PM(1회) + 서브태스크(2회) = 총 3회
    expect(mockRunner.run).toHaveBeenCalledTimes(3);
  });

  it('PM 첫 번째 run 호출의 agentId는 "pm"이다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask());

    const pmCall = mockRunner.run.mock.calls[0][0];
    expect(pmCall.agentId).toBe('pm');
    expect(pmCall.workspaceId).toBe('default');
  });

  it('서브태스크 run 호출의 agentId는 각 role과 일치한다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask());

    const subCalls = mockRunner.run.mock.calls.slice(1);
    expect(subCalls[0][0].agentId).toBe('backend');
    expect(subCalls[1][0].agentId).toBe('frontend');
  });

  it('서브태스크 run 호출의 prompt는 PM이 반환한 값과 일치한다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask());

    const subCalls = mockRunner.run.mock.calls.slice(1);
    expect(subCalls[0][0].prompt).toBe('JWT 인증 API 구현');
    expect(subCalls[1][0].prompt).toBe('로그인 폼 UI 구현');
  });

  it('workspaceId가 서브태스크 run 호출에도 전파된다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask({ workspaceId: 'workspace-42' }));

    for (const [req] of mockRunner.run.mock.calls) {
      expect(req.workspaceId).toBe('workspace-42');
    }
  });

  it('ANSI escape 코드가 포함된 PM 출력에서도 JSON을 파싱한다', async () => {
    const withAnsi = `\x1b[32m${JSON.stringify(PM_SUBTASKS)}\x1b[0m`;
    simulatePmRun(withAnsi);
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask());

    // PM 1회 + 서브태스크 2회
    expect(mockRunner.run).toHaveBeenCalledTimes(3);
  });

  it('PM 출력에 앞뒤 텍스트가 있어도 JSON 배열을 추출한다', async () => {
    const mixed = `아래 서브태스크를 분해했습니다:\n${JSON.stringify(PM_SUBTASKS)}\n완료.`;
    simulatePmRun(mixed);
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await service.dispatch(makeTask());

    expect(mockRunner.run).toHaveBeenCalledTimes(3);
  });
});

describe('OrchestratorService — PM 실패 경로', () => {
  let service: OrchestratorService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await buildService();
  });

  it('PM run이 throw하면 agent:error 이벤트를 ingest하고 서브태스크는 실행하지 않는다', async () => {
    mockRunner.run.mockRejectedValueOnce(new Error('pty spawn 실패'));

    await service.dispatch(makeTask());

    // 서브태스크 실행 없음 — PM 1회만 호출
    expect(mockRunner.run).toHaveBeenCalledTimes(1);

    const errorEvent = mockEventsService.ingest.mock.calls[0][0];
    expect(errorEvent.type).toBe('agent:error');
    expect(errorEvent.agentId).toBe('pm');
    expect(errorEvent.payload.taskId).toBe(TASK_ID);
  });

  it('PM 출력이 JSON 배열이 없으면 agent:error를 ingest한다', async () => {
    simulatePmRun('이해했습니다. 작업을 시작하겠습니다.');

    await service.dispatch(makeTask());

    expect(mockRunner.run).toHaveBeenCalledTimes(1);

    const errorEvent = mockEventsService.ingest.mock.calls[0][0];
    expect(errorEvent.type).toBe('agent:error');
  });

  it('PM 출력이 빈 배열이면 agent:error를 ingest한다', async () => {
    simulatePmRun('[]');

    await service.dispatch(makeTask());

    expect(mockRunner.run).toHaveBeenCalledTimes(1);

    const errorEvent = mockEventsService.ingest.mock.calls[0][0];
    expect(errorEvent.type).toBe('agent:error');
  });

  it('PM 출력이 유효하지 않은 JSON이면 agent:error를 ingest한다', async () => {
    simulatePmRun('[{role: broken json}]');

    await service.dispatch(makeTask());

    const errorEvent = mockEventsService.ingest.mock.calls[0][0];
    expect(errorEvent.type).toBe('agent:error');
  });
});

describe('OrchestratorService — 서브태스크 부분 실패', () => {
  let service: OrchestratorService;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = await buildService();
  });

  it('서브태스크 하나가 실패해도 나머지는 실행되고 dispatch가 resolve된다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));

    // backend 성공, frontend 실패
    mockRunner.run
      .mockResolvedValueOnce({ stdout: 'done', exitCode: 0, durationMs: 100 })
      .mockRejectedValueOnce(new Error('frontend 빌드 에러'));

    // dispatch는 Promise.allSettled이므로 reject되지 않아야 한다
    await expect(service.dispatch(makeTask())).resolves.toBeUndefined();

    expect(mockRunner.run).toHaveBeenCalledTimes(3);
  });

  it('모든 서브태스크가 실패해도 dispatch가 resolve된다', async () => {
    simulatePmRun(JSON.stringify(PM_SUBTASKS));

    mockRunner.run
      .mockRejectedValueOnce(new Error('backend 실패'))
      .mockRejectedValueOnce(new Error('frontend 실패'));

    await expect(service.dispatch(makeTask())).resolves.toBeUndefined();
  });
});
