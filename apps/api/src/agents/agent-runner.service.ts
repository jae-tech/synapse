import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AgentAdapter, AgentResult, AgentRunOptions } from './adapters/agent-adapter.interface';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { EventsService } from '@/events/events.service';

export interface AgentRunRequest {
  agentId: string;
  workspaceId: string;
  prompt: string;
  workdir?: string;
  timeoutMs?: number;
  env?: Record<string, string>;
  /** PTY 청크를 Socket으로 relay할 콜백 (caller가 주입) */
  onPtyData?: (chunk: string) => void;
}

@Injectable()
export class AgentRunnerService {
  private readonly logger = new Logger(AgentRunnerService.name);

  constructor(
    private readonly adapter: ClaudeAdapter,
    private readonly eventsService: EventsService,
  ) {}

  async run(req: AgentRunRequest): Promise<AgentResult> {
    const { agentId, workspaceId, prompt, workdir, timeoutMs, env, onPtyData } = req;

    // spawn 직전에 agent:start 이벤트 ingest → VirtualOffice 캐릭터 즉시 활성화 (D8)
    await this.eventsService.ingest({
      id: randomUUID(),
      agentId,
      type: 'agent:start',
      payload: {},
      timestamp: new Date().toISOString(),
      workspaceId,
    });

    const options: AgentRunOptions = {
      agentId,
      workspaceId,
      workdir: workdir ?? process.cwd(),
      timeoutMs,
      env,
      onPtyData: (chunk) => {
        // PTY 청크를 caller가 주입한 콜백으로 relay
        onPtyData?.(chunk);
      },
    };

    try {
      const result = await this.adapter.run(prompt, options);

      await this.eventsService.ingest({
        id: randomUUID(),
        agentId,
        type: result.exitCode === 0 ? 'agent:complete' : 'agent:error',
        payload: { exitCode: result.exitCode, durationMs: result.durationMs },
        timestamp: new Date().toISOString(),
        workspaceId,
      });

      return result;
    } catch (err) {
      this.logger.error(`AgentRunner[${agentId}] 실패`, err);

      await this.eventsService
        .ingest({
          id: randomUUID(),
          agentId,
          type: 'agent:error',
          payload: { error: String(err) },
          timestamp: new Date().toISOString(),
          workspaceId,
        })
        .catch(() => {
          // ingest 자체 실패 시 로그만 남기고 re-throw는 하지 않는다
          this.logger.warn(`AgentRunner[${agentId}] error 이벤트 ingest 실패`);
        });

      throw err;
    }
  }
}
