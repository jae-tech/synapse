import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { AgentsModule } from '@/agents/agents.module';
import { EventsModule } from '@/events/events.module';

@Module({
  imports: [AgentsModule, EventsModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
