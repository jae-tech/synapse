import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AgentRunnerService } from '@/agents/agent-runner.service';
import { EventsService } from '@/events/events.service';
import { Task } from '@/db/schema';

interface Subtask {
  role: string;
  prompt: string;
}

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly agentRunner: AgentRunnerService,
    private readonly eventsService: EventsService,
  ) {}

  async dispatch(task: Task): Promise<void> {
    const { id: taskId, issue, workspaceId } = task;

    // PM 에이전트에게 이슈를 서브태스크 JSON으로 분해 요청
    const pmPrompt = `다음 이슈를 개발 서브태스크 JSON 배열로 분해해줘. 각 항목은 {"role":"<역할>","prompt":"<구체적 작업 지시>"} 형태여야 해. role은 backend, frontend, qa, reviewer, devops 중 하나. JSON 배열만 출력하고 다른 설명은 하지 마.\n\n이슈: ${issue}`;

    let subtasks: Subtask[] = [];

    try {
      let pmOutput = '';
      await this.agentRunner.run({
        agentId: 'pm',
        workspaceId,
        prompt: pmPrompt,
        timeoutMs: 120_000,
        onPtyData: (chunk) => {
          pmOutput += chunk;
        },
      });

      // JSON 배열 추출 (ANSI escape 코드 제거 후 파싱)
      const clean = pmOutput.replace(/\x1b\[[0-9;]*m/g, '').trim();
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('PM 응답에서 JSON 배열을 찾을 수 없음');

      subtasks = JSON.parse(jsonMatch[0]) as Subtask[];
      if (!Array.isArray(subtasks) || subtasks.length === 0) {
        throw new Error('PM이 빈 서브태스크 목록 반환');
      }
    } catch (err) {
      this.logger.error(`Task[${taskId}] PM 분해 실패`, err);
      await this.eventsService
        .ingest({
          id: randomUUID(),
          agentId: 'pm',
          type: 'agent:error',
          payload: { taskId, error: String(err) },
          timestamp: new Date().toISOString(),
          workspaceId,
        })
        .catch(() => {});
      return;
    }

    // 서브태스크 병렬 실행 (D9: 개별 실패는 다른 태스크에 영향 없음)
    await Promise.allSettled(
      subtasks.map((sub) =>
        this.agentRunner.run({
          agentId: sub.role,
          workspaceId,
          prompt: sub.prompt,
          timeoutMs: 300_000,
        }),
      ),
    );
  }
}
