import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { getRepositoryToken } from '@nestjs/typeorm';
import supertest from 'supertest';
import { EventsController } from '../src/events/events.controller';
import { EventsService } from '../src/events/events.service';
import { EventsGateway } from '../src/events/events.gateway';
import { EventEntity } from '../src/events/event.entity';

const mockRepo = {
  create: vi.fn((data) => data),
  save: vi.fn().mockResolvedValue({}),
  find: vi.fn().mockResolvedValue([]),
};

const mockServer = { emit: vi.fn() };
const mockGateway = {
  broadcast: vi.fn(),
  server: mockServer,
};

describe('POST /events', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        EventsService,
        { provide: EventsGateway, useValue: mockGateway },
        { provide: getRepositoryToken(EventEntity), useValue: mockRepo },
      ],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('유효한 이벤트 → 201', async () => {
    const validEvent = {
      agentId: 'backend',
      type: 'tool_use',
      tool: 'Edit',
      payload: { input: 'some content', file: 'src/main.ts' },
      timestamp: new Date().toISOString(),
      workspaceId: 'default',
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(validEvent)
      .expect(201);

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockGateway.broadcast).toHaveBeenCalledTimes(1);
  });

  it('빈 바디 → 400', async () => {
    await supertest(app.getHttpServer())
      .post('/events')
      .send({})
      .expect(400);

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('agentId regex 검증: backend-1 허용 → 201', async () => {
    const event = {
      agentId: 'backend-1',
      type: 'tool_use',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(201);
  });

  it('agentId 대문자 → 400', async () => {
    const event = {
      agentId: 'Backend',
      type: 'tool_use',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(400);
  });

  it('잘못된 type → 400', async () => {
    const invalidEvent = {
      agentId: 'backend',
      type: 'unknown_type',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(invalidEvent)
      .expect(400);
  });

  it('DB 저장 실패 → 503', async () => {
    mockRepo.save.mockRejectedValueOnce(new Error('DB down'));

    const event = {
      agentId: 'backend',
      type: 'tool_use',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(503);

    expect(mockGateway.broadcast).not.toHaveBeenCalled();
  });
});
