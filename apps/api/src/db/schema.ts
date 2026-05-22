import { pgTable, uuid, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: varchar('agent_id', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  tool: varchar('tool', { length: 100 }),
  payload: jsonb('payload').notNull().default({}),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  workspaceId: varchar('workspace_id', { length: 50 }).notNull().default('default'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
