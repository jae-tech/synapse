import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AgentsModule } from '@/agents/agents.module';
import { EventsModule } from '@/events/events.module';
import { OrchestratorModule } from '@/orchestrator/orchestrator.module';

@Module({
  imports: [AgentsModule, EventsModule, OrchestratorModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
