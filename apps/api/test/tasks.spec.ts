import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { TasksController } from '@/tasks/tasks.controller';
import { TasksService } from '@/tasks/tasks.service';
import { OrchestratorService } from '@/orchestrator/orchestrator.service';

const VALID_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';

const mockTask = {
  id: VALID_UUID,
  issue: '로그인 기능 구현',
  workspaceId: 'default',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTasksService = {
  create: vi.fn().mockResolvedValue(mockTask),
  findById: vi.fn().mockResolvedValue(mockTask),
};

const mockOrchestrator = {
  dispatch: vi.fn().mockResolvedValue(undefined),
};

describe('POST /tasks', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTasksService.create.mockResolvedValue(mockTask);
    mockOrchestrator.dispatch.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: OrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('유효한 이슈 → 202 + id/status 반환', async () => {
    const res = await supertest(app.getHttpServer())
      .post('/tasks')
      .send({ issue: '로그인 기능 구현', workspaceId: 'default' })
      .expect(202);

    expect(res.body).toMatchObject({ id: mockTask.id, status: 'pending' });
    expect(mockTasksService.create).toHaveBeenCalledTimes(1);
  });

  it('orchestrator는 fire-and-forget (즉시 반환)', async () => {
    // dispatch가 늦게 resolve되어도 202 즉시 반환
    mockOrchestrator.dispatch.mockReturnValue(new Promise((r) => setTimeout(r, 5000)));

    await supertest(app.getHttpServer()).post('/tasks').send({ issue: '느린 태스크' }).expect(202);
  });

  it('빈 issue → 400', async () => {
    await supertest(app.getHttpServer()).post('/tasks').send({ issue: '' }).expect(400);
    expect(mockTasksService.create).not.toHaveBeenCalled();
  });

  it('issue 누락 → 400', async () => {
    await supertest(app.getHttpServer()).post('/tasks').send({}).expect(400);
  });

  it('DB 저장 실패 → 503', async () => {
    mockTasksService.create.mockRejectedValue(new Error('DB down'));
    await supertest(app.getHttpServer()).post('/tasks').send({ issue: '태스크' }).expect(503);

    expect(mockOrchestrator.dispatch).not.toHaveBeenCalled();
  });
});

describe('GET /tasks/:id', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockTasksService.findById.mockResolvedValue(mockTask);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: OrchestratorService, useValue: mockOrchestrator },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('존재하는 task → 200 + 전체 필드 반환', async () => {
    const res = await supertest(app.getHttpServer()).get(`/tasks/${VALID_UUID}`).expect(200);

    expect(res.body).toMatchObject({
      id: VALID_UUID,
      issue: '로그인 기능 구현',
      workspaceId: 'default',
      status: 'pending',
    });
    expect(mockTasksService.findById).toHaveBeenCalledWith(VALID_UUID);
  });

  it('존재하지 않는 task → 404', async () => {
    mockTasksService.findById.mockResolvedValue(undefined);
    await supertest(app.getHttpServer()).get(`/tasks/${VALID_UUID}`).expect(404);
  });

  it('UUID 형식 아님 → 400', async () => {
    await supertest(app.getHttpServer()).get('/tasks/not-a-uuid').expect(400);
    expect(mockTasksService.findById).not.toHaveBeenCalled();
  });
});
