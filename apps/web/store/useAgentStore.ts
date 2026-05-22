import { create } from 'zustand';
import { useMemo } from 'react';
import type { AgentEvent } from '@synapse/schemas';

interface AgentState {
  status: 'idle' | 'working' | 'done' | 'error';
  lastEvent: AgentEvent | null;
  doneAt: number | null;
}

interface GroupedAgent {
  role: string;
  instances: Array<{ agentId: string } & AgentState>;
  summaryStatus: AgentState['status'];
}

interface AgentStore {
  events: AgentEvent[];
  agents: Record<string, AgentState>;
  seenIds: Set<string>;
  addEvent: (event: AgentEvent) => void;
  setReplay: (events: AgentEvent[]) => void;
  connected: boolean;
  connectionError: string | null;
  setConnected: (v: boolean) => void;
  setConnectionError: (err: string | null) => void;
  // agentId별 PTY 출력 누적 버퍼
  ptyBuffers: Record<string, string>;
  appendPty: (agentId: string, chunk: string) => void;
}

export const DONE_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const KNOWN_ROLES = ['pm', 'backend', 'frontend', 'qa', 'reviewer', 'devops'] as const;

export function extractRole(agentId: string): string {
  return KNOWN_ROLES.find((r) => agentId === r || agentId.startsWith(r + '-')) ?? 'unknown';
}

const STATUS_PRIORITY: Record<AgentState['status'], number> = {
  error: 4,
  working: 3,
  done: 2,
  idle: 1,
};

const initialAgentState = (): AgentState => ({
  status: 'idle',
  lastEvent: null,
  doneAt: null,
});

function deriveStatus(event: AgentEvent): AgentState['status'] {
  if (event.type === 'agent:complete') return 'done';
  if (event.type === 'agent:error') return 'error';
  if (event.type === 'agent:start') return 'working';
  if (event.type === 'status' && event.payload['content'] === 'done') return 'done';
  if (event.type === 'status' && event.payload['content'] === 'error') return 'error';
  if (event.type === 'commit') return 'done';
  return 'working';
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  events: [],
  agents: {},
  seenIds: new Set(),
  connected: false,
  connectionError: null,
  ptyBuffers: {},

  setConnected: (v) => set({ connected: v, connectionError: v ? null : get().connectionError }),
  setConnectionError: (err) => set({ connectionError: err }),
  appendPty: (agentId, chunk) =>
    set((s) => ({
      ptyBuffers: {
        ...s.ptyBuffers,
        // 최근 64KB만 유지 — 무한 누적 방지
        [agentId]: ((s.ptyBuffers[agentId] ?? '') + chunk).slice(-65536),
      },
    })),

  addEvent: (event) =>
    set((state) => {
      // id-based dedup: replay+broadcast 경쟁조건 방지 (E2-5)
      if (state.seenIds.has(event.id)) return state;
      const seenIds = new Set(state.seenIds);
      seenIds.add(event.id);

      const status = deriveStatus(event);
      const agentPrev = state.agents[event.agentId] ?? initialAgentState();

      return {
        events: [...state.events.slice(-200), event],
        seenIds,
        agents: {
          ...state.agents,
          [event.agentId]: {
            status,
            lastEvent: event,
            doneAt: status === 'done' ? new Date(event.timestamp).getTime() : agentPrev.doneAt,
          },
        },
      };
    }),

  setReplay: (events) =>
    set(() => {
      const agents: Record<string, AgentState> = {};
      const seenIds = new Set<string>();
      // ASC 순서로 수신 → 마지막 이벤트가 최신 상태 (E2-2)
      for (const event of events) {
        seenIds.add(event.id);
        const status = deriveStatus(event);
        agents[event.agentId] = {
          status,
          lastEvent: event,
          doneAt: status === 'done' ? new Date(event.timestamp).getTime() : null,
        };
      }
      return { events: events.slice(-200), agents, seenIds, ptyBuffers: {} };
    }),
}));

export function useGroupedAgents(): Record<string, GroupedAgent> {
  const agents = useAgentStore((s) => s.agents);
  return useMemo(() => {
    const grouped: Record<string, GroupedAgent> = {};
    for (const [agentId, state] of Object.entries(agents)) {
      const role = extractRole(agentId);
      if (role === 'unknown') continue;
      if (!grouped[role]) {
        grouped[role] = { role, instances: [], summaryStatus: 'idle' };
      }
      grouped[role].instances.push({ agentId, ...state });
    }
    for (const g of Object.values(grouped)) {
      const maxPriority = Math.max(...g.instances.map((i) => STATUS_PRIORITY[i.status] ?? 0));
      const summaryStatus = (Object.entries(STATUS_PRIORITY).find(
        ([, v]) => v === maxPriority,
      )?.[0] ?? 'idle') as AgentState['status'];
      g.summaryStatus = summaryStatus;
    }
    return grouped;
  }, [agents]);
}
