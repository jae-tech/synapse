import { z } from 'zod';

export const AgentRoleSchema = z.enum(['pm', 'backend', 'frontend', 'qa', 'reviewer', 'devops']);

export const AgentEventSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  agentId: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9-]*$/, 'agentId must be lowercase alphanumeric with hyphens'),
  type: z.enum([
    'tool_use',
    'tool_result',
    'thinking',
    'status',
    'file_change',
    'bash',
    'commit',
    'agent:start',
    'agent:complete',
    'agent:error',
  ]),
  tool: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().datetime(),
  workspaceId: z.string().default('default'),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  issue: z.string().min(1).max(2000),
  workspaceId: z.string().default('default'),
  status: z.enum(['pending', 'running', 'done', 'failed']),
  createdAt: z.string().datetime(),
});

export const CreateTaskSchema = TaskSchema.pick({
  issue: true,
  workspaceId: true,
});

export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
