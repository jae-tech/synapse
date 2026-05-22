import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN, DrizzleDb } from '@/db/index';
import { tasks, NewTask, Task } from '@/db/schema';

@Injectable()
export class TasksService {
  constructor(@Inject(DB_TOKEN) private readonly db: DrizzleDb) {}

  async create(data: Pick<NewTask, 'issue' | 'workspaceId'>): Promise<Task> {
    const [row] = await this.db
      .insert(tasks)
      .values({ issue: data.issue, workspaceId: data.workspaceId })
      .returning();
    return row;
  }

  async findById(id: string): Promise<Task | undefined> {
    const [row] = await this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return row;
  }
}
