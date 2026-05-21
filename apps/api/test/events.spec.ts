import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import supertest from 'supertest';
import { EventsModule } from '../src/events/events.module';

describe('POST /events', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventsModule],
    }).compile();

    app = module.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('유효한 이벤트 → 204', async () => {
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
      .expect(204);
  });

  it('빈 바디 → 400', async () => {
    await supertest(app.getHttpServer())
      .post('/events')
      .send({})
      .expect(400);
  });

  it('agentId가 임의 문자열도 허용 → 204', async () => {
    // agentId는 z.string()으로 완화됨 (pipe-to-nestjs.js 유연성)
    const event = {
      agentId: 'custom-agent',
      type: 'tool_use',
      payload: {},
      timestamp: new Date().toISOString(),
    };

    await supertest(app.getHttpServer())
      .post('/events')
      .send(event)
      .expect(204);
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
});
