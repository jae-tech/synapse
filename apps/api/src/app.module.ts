import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { EventsModule } from './events/events.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    EventsModule,
    AgentsModule,
    TasksModule,
  ],
})
export class AppModule {}
