import { describe, it, expect } from 'vitest';
import { AgentEventSchema, CreateTaskSchema, TaskSchema } from './index';

function baseEvent(overrides: Record<string, unknown> = {}) {
  return {
    agentId: 'backend',
    type: 'tool_use',
    payload: {},
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

describe('AgentEventSchema — agentId validation', () => {
  it('단일 role 허용', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'backend' })).success).toBe(true);
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'pm' })).success).toBe(true);
  });

  it('role-N 형태 허용', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'backend-1' })).success).toBe(true);
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'frontend-2' })).success).toBe(true);
  });

  it('대문자 → 거부', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'Backend' })).success).toBe(false);
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'BACKEND-1' })).success).toBe(false);
  });

  it('빈 문자열 → 거부', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: '' })).success).toBe(false);
  });

  it('50자 → 허용', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'a'.repeat(50) })).success).toBe(true);
  });

  it('51자 → 거부', () => {
    expect(AgentEventSchema.safeParse(baseEvent({ agentId: 'a'.repeat(51) })).success).toBe(false);
  });
});

describe('TaskSchema', () => {
  it('유효한 task 허용', () => {
    const result = TaskSchema.safeParse({
      id: crypto.randomUUID(),
      issue: '로그인 버그 수정',
      workspaceId: 'default',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
  });

  it('빈 issue → 거부', () => {
    expect(
      CreateTaskSchema.safeParse({
        issue: '',
        workspaceId: 'default',
      }).success,
    ).toBe(false);
  });

  it('issue 2000자 → 허용', () => {
    expect(
      CreateTaskSchema.safeParse({
        issue: 'a'.repeat(2000),
        workspaceId: 'default',
      }).success,
    ).toBe(true);
  });

  it('issue 2001자 → 거부', () => {
    expect(
      CreateTaskSchema.safeParse({
        issue: 'a'.repeat(2001),
        workspaceId: 'default',
      }).success,
    ).toBe(false);
  });

  it('workspaceId 기본값 적용', () => {
    const result = CreateTaskSchema.parse({
      issue: '작업 요청',
    });

    expect(result.workspaceId).toBe('default');
  });
});
