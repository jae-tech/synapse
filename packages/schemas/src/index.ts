import { z } from 'zod';

export const AgentRoleSchema = z.enum([
  'pm',
  'backend',
  'frontend',
  'qa',
  'reviewer',
  'devops',
]);

export const AgentEventSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  agentId: z.string(),
  type: z.enum(['tool_use', 'tool_result', 'thinking', 'status', 'file_change', 'bash', 'commit']),
  tool: z.string().optional(),
  payload: z.object({
    input: z.string().max(500).optional(),
    output: z.string().max(500).optional(),
    content: z.string().max(500).optional(),
    file: z.string().max(500).optional(),
    command: z.string().optional(),
  }),
  timestamp: z.string().datetime(),
  workspaceId: z.string().default('default'),
});

export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
