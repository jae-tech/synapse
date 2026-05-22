import {
  Controller,
  Post,
  Body,
  HttpCode,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { TasksService } from './tasks.service';
import { OrchestratorService } from '@/orchestrator/orchestrator.service';

const CreateTaskBodySchema = z.object({
  issue: z.string().min(1).max(2000),
  workspaceId: z.string().min(1).max(50).default('default'),
});

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly orchestrator: OrchestratorService,
  ) {}

  @Post()
  @HttpCode(202)
  async create(@Body() body: unknown) {
    const parsed = CreateTaskBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    let task;
    try {
      task = await this.tasksService.create(parsed.data);
    } catch {
      throw new ServiceUnavailableException('태스크 저장 실패');
    }

    // fire-and-forget (D11): 202 즉시 반환, orchestrator 백그라운드 실행
    void this.orchestrator.dispatch(task).catch((err) => {
      // 최상위 unhandled rejection 방지
      console.error(`[OrchestratorService] dispatch 실패 task=${task.id}`, err);
    });

    return { id: task.id, status: task.status };
  }
}
