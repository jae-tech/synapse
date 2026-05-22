import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { AgentsController } from '@/agents/agents.controller';
import { AgentRunnerService } from '@/agents/agent-runner.service';
import { EventsGateway } from '@/events/events.gateway';

const mockRunner = {
  run: vi.fn(),
  getRunningAgents: vi.fn().mockReturnValue([]),
};

const mockGateway = {
  broadcastPty: vi.fn(),
  server: {
    emit: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  },
};

describe('POST /agents/run', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    // fire-and-forget: run이 오래 걸려도 202 즉시 반환 확인
    mockRunner.run.mockReturnValue(new Promise(() => {}));

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        { provide: AgentRunnerService, useValue: mockRunner },
        { provide: EventsGateway, useValue: mockGateway },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('유효한 body → 202 + agentId/workspaceId 반환', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ agentId: 'backend', workspaceId: 'default', prompt: '로그인 API 구현' })
      .expect(202);

    expect(res.body).toMatchObject({ agentId: 'backend', workspaceId: 'default' });
    expect(mockRunner.run).toHaveBeenCalledTimes(1);
  });

  it('runner는 fire-and-forget — 즉시 202 반환', async () => {
    // run이 절대 resolve되지 않아도 응답은 온다
    mockRunner.run.mockReturnValue(new Promise(() => {}));

    const start = Date.now();
    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ agentId: 'pm', workspaceId: 'ws-1', prompt: '기획서 작성' })
      .expect(202);

    expect(Date.now() - start).toBeLessThan(500);
  });

  it('agentId 누락 → 400', async () => {
    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ workspaceId: 'default', prompt: '테스트' })
      .expect(400);

    expect(mockRunner.run).not.toHaveBeenCalled();
  });

  it('prompt 누락 → 400', async () => {
    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ agentId: 'backend', workspaceId: 'default' })
      .expect(400);
  });

  it('빈 agentId → 400', async () => {
    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ agentId: '', workspaceId: 'default', prompt: '테스트' })
      .expect(400);
  });

  it('PTY 청크 수신 시 gateway.server.emit(pty:data) 호출', async () => {
    let capturedOnPtyData: ((chunk: string) => void) | undefined;

    mockRunner.run.mockImplementation(async (req: { onPtyData?: (c: string) => void }) => {
      capturedOnPtyData = req.onPtyData;
    });

    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({ agentId: 'backend', workspaceId: 'default', prompt: '구현' })
      .expect(202);

    // 약간 기다려 fire-and-forget 실행
    await new Promise((r) => setTimeout(r, 50));

    capturedOnPtyData?.('hello chunk');

    expect(mockGateway.broadcastPty).toHaveBeenCalledWith('default', 'backend', 'hello chunk');
  });

  it('workdir / timeoutMs 옵션이 runner.run에 전달된다', async () => {
    mockRunner.run.mockResolvedValue({ stdout: '', exitCode: 0, durationMs: 10 });

    await supertest(app.getHttpServer())
      .post('/agents/run')
      .send({
        agentId: 'devops',
        workspaceId: 'ws-2',
        prompt: '배포',
        workdir: '/tmp/project',
        timeoutMs: 60000,
      })
      .expect(202);

    await new Promise((r) => setTimeout(r, 50));

    const call = mockRunner.run.mock.calls[0][0];
    expect(call).toMatchObject({
      agentId: 'devops',
      workspaceId: 'ws-2',
      prompt: '배포',
      workdir: '/tmp/project',
      timeoutMs: 60000,
    });
  });
});

describe('GET /agents/status', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        { provide: AgentRunnerService, useValue: mockRunner },
        { provide: EventsGateway, useValue: mockGateway },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('실행 중인 에이전트 없음 → { running: [] }', async () => {
    mockRunner.getRunningAgents.mockReturnValue([]);
    const res = await supertest(app.getHttpServer()).get('/agents/status').expect(200);
    expect(res.body).toEqual({ running: [] });
  });

  it('실행 중인 에이전트 있음 → 목록 반환', async () => {
    const agent = { agentId: 'backend', workspaceId: 'default', startedAt: '2026-01-01T00:00:00Z' };
    mockRunner.getRunningAgents.mockReturnValue([agent]);

    const res = await supertest(app.getHttpServer()).get('/agents/status').expect(200);
    expect(res.body.running).toHaveLength(1);
    expect(res.body.running[0]).toMatchObject({ agentId: 'backend' });
  });
});
