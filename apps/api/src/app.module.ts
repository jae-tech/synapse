import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { EventsModule } from './events/events.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DbModule, EventsModule, AgentsModule],
})
export class AppModule {}
