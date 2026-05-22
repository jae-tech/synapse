import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, jsonb, timestamp, text, index } from 'drizzle-orm/pg-core';

// @ts-ignore TS2883: Drizzle builder 타입이 declaration emit에서 pnpm 내부 경로를 참조한다.
const eventColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  tool: varchar('tool', { length: 100 }),
  payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  workspaceId: varchar('workspace_id', { length: 50 }).notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
};

// @ts-ignore TS2883: Drizzle builder 타입이 declaration emit에서 pnpm 내부 경로를 참조한다.
const taskColumns = {
  id: uuid('id').primaryKey().defaultRandom(),
  issue: text('issue').notNull(),
  workspaceId: varchar('workspace_id', { length: 50 }).notNull().default('default'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const events: ReturnType<typeof pgTable<'events', typeof eventColumns>> = pgTable(
  'events',
  eventColumns,
  (table) => [
    index('IDX_events_workspace_created').on(table.workspaceId, table.createdAt),
    index('IDX_events_agent_created').on(table.agentId, table.createdAt),
  ],
);

export const tasks: ReturnType<typeof pgTable<'tasks', typeof taskColumns>> = pgTable('tasks', taskColumns);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
