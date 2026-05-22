import { Controller, Post, Get, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { AgentRunnerService } from './agent-runner.service';
import { EventsGateway } from '@/events/events.gateway';

const RunAgentBodySchema = z.object({
  agentId: z.string().min(1),
  workspaceId: z.string().min(1),
  prompt: z.string().min(1),
  workdir: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly runner: AgentRunnerService,
    private readonly gateway: EventsGateway,
  ) {}

  @Post('run')
  @HttpCode(202)
  run(@Body() body: unknown) {
    const parsed = RunAgentBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    const { agentId, workspaceId, prompt, workdir, timeoutMs } = parsed.data;

    // fire-and-forget — 202 즉시 반환 (D11)
    void this.runner.run({
      agentId,
      workspaceId,
      prompt,
      workdir,
      timeoutMs,
      onPtyData: (chunk) => {
        this.gateway.server.emit('pty:data', { agentId, data: chunk });
      },
    });

    return { agentId, workspaceId };
  }

  @Get('status')
  status() {
    return { running: this.runner.getRunningAgents() };
  }
}
