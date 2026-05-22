import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './events/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // D3: 환경변수로 CORS 설정
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3010',
    methods: ['GET', 'POST'],
  });

  const wsRedisEnabled = process.env.WS_REDIS_ENABLED === '1';
  const wsRedisUrl = process.env.WS_REDIS_URL ?? 'redis://localhost:6379';
  if (wsRedisEnabled) {
    const redisAdapter = new RedisIoAdapter(app);
    await redisAdapter.connect(wsRedisUrl);
    app.useWebSocketAdapter(redisAdapter);
    app.enableShutdownHooks();
    app
      .getHttpAdapter()
      .getInstance()
      .addHook('onClose', async () => {
        await redisAdapter.close();
      });
    console.log(`[ws] Redis adapter enabled (${wsRedisUrl})`);
  } else {
    console.log('[ws] In-memory adapter mode');
  }

  const port = parseInt(process.env.PORT ?? '3011', 10);
  // 127.0.0.1: 로컬 전용 도구 — 외부 네트워크 노출 차단
  await app.listen(port, '127.0.0.1');
  console.log(`Synapse API listening on http://localhost:${port}`);
}

bootstrap();
