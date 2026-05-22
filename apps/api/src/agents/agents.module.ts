import { Module } from '@nestjs/common';
import { EventsModule } from '@/events/events.module';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { AgentRunnerService } from './agent-runner.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [EventsModule],
  controllers: [AgentsController],
  providers: [ClaudeAdapter, AgentRunnerService],
  exports: [AgentRunnerService],
})
export class AgentsModule {}
