import { describe, it, expect, beforeEach } from 'vitest';
import { useAgentStore, extractRole, DONE_IDLE_TIMEOUT_MS } from './useAgentStore';
import type { AgentEvent } from '@synapse/schemas';

function makeEvent(overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    id: crypto.randomUUID(),
    agentId: 'backend',
    type: 'tool_use',
    payload: {},
    timestamp: new Date().toISOString(),
    workspaceId: 'default',
    ...overrides,
  };
}

beforeEach(() => {
  useAgentStore.setState({ events: [], agents: {}, seenIds: new Set() });
});

describe('extractRole', () => {
  it('단일 role → 자기 자신', () => {
    expect(extractRole('backend')).toBe('backend');
    expect(extractRole('pm')).toBe('pm');
  });

  it('role-N 형태 → role 반환', () => {
    expect(extractRole('backend-1')).toBe('backend');
    expect(extractRole('frontend-2')).toBe('frontend');
  });

  it('알 수 없는 agentId → unknown', () => {
    expect(extractRole('custom-agent')).toBe('unknown');
    expect(extractRole('mybot')).toBe('unknown');
  });
});

describe('addEvent', () => {
  it('이벤트 추가 → agents 상태 갱신', () => {
    const event = makeEvent({ agentId: 'backend-1', type: 'tool_use' });
    useAgentStore.getState().addEvent(event);

    const { agents } = useAgentStore.getState();
    expect(agents['backend-1']?.status).toBe('working');
    expect(agents['backend-1']?.lastEvent?.id).toBe(event.id);
  });

  it('status 이벤트 done → agents.status === done', () => {
    const event = makeEvent({
      agentId: 'backend',
      type: 'status',
      payload: { content: 'done' },
    });
    useAgentStore.getState().addEvent(event);

    expect(useAgentStore.getState().agents['backend']?.status).toBe('done');
  });

  it('status 이벤트 error → agents.status === error', () => {
    const event = makeEvent({
      type: 'status',
      payload: { content: 'error' },
    });
    useAgentStore.getState().addEvent(event);

    expect(useAgentStore.getState().agents['backend']?.status).toBe('error');
  });

  it('중복 id → 두 번째 무시 (E2-5 dedup)', () => {
    const id = crypto.randomUUID();
    const e1 = makeEvent({ id, type: 'tool_use' });
    const e2 = makeEvent({ id, type: 'status', payload: { content: 'done' } });

    useAgentStore.getState().addEvent(e1);
    useAgentStore.getState().addEvent(e2);

    // 두 번째 이벤트 무시 → 상태가 done으로 변경되지 않음
    expect(useAgentStore.getState().agents['backend']?.status).toBe('working');
    expect(useAgentStore.getState().events).toHaveLength(1);
  });
});

describe('setReplay', () => {
  it('ASC 순서 → 마지막 이벤트 상태가 최종 적용 (E2-2)', () => {
    const events: AgentEvent[] = [
      makeEvent({ agentId: 'backend-1', type: 'tool_use', timestamp: '2026-01-01T00:00:00Z' }),
      makeEvent({ agentId: 'backend-1', type: 'status', payload: { content: 'done' }, timestamp: '2026-01-01T01:00:00Z' }),
    ];
    useAgentStore.getState().setReplay(events);

    expect(useAgentStore.getState().agents['backend-1']?.status).toBe('done');
  });

  it('replay 후 seenIds에 모든 id 등록', () => {
    const e1 = makeEvent({ id: 'aaa' });
    const e2 = makeEvent({ id: 'bbb' });
    useAgentStore.getState().setReplay([e1, e2]);

    const { seenIds } = useAgentStore.getState();
    expect(seenIds.has('aaa')).toBe(true);
    expect(seenIds.has('bbb')).toBe(true);
  });

  it('replay 후 live 이벤트 중복 dedup', () => {
    const shared = makeEvent({ id: 'shared-id', type: 'tool_use' });
    useAgentStore.getState().setReplay([shared]);

    // 동일 id의 live 이벤트 → 무시
    const liveEvent = makeEvent({ id: 'shared-id', type: 'status', payload: { content: 'done' } });
    useAgentStore.getState().addEvent(liveEvent);

    expect(useAgentStore.getState().agents['backend']?.status).toBe('working');
  });
});
