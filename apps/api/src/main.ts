import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // D3: 환경변수로 CORS 설정
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3010",
    methods: ["GET", "POST"],
  });

  const port = parseInt(process.env.PORT ?? "3011", 10);
  // 127.0.0.1: 로컬 전용 도구 — 외부 네트워크 노출 차단
  await app.listen(port, "127.0.0.1");
  console.log(`Synapse API listening on http://localhost:${port}`);
}

bootstrap();
