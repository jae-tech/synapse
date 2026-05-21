import { create } from "zustand";
import type { AgentEvent, AgentRole } from "@synapse/schemas";

interface AgentState {
  status: "idle" | "working" | "done" | "error";
  lastEvent: AgentEvent | null;
  doneAt: number | null;
}

interface AgentStore {
  events: AgentEvent[];
  agents: Record<string, AgentState>;
  addEvent: (event: AgentEvent) => void;
  setReplay: (events: AgentEvent[]) => void;
  connected: boolean;
  connectionError: string | null;
  setConnected: (v: boolean) => void;
  setConnectionError: (err: string | null) => void;
}

export const DONE_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const initialAgentState = (): AgentState => ({
  status: "idle",
  lastEvent: null,
  doneAt: null,
});

function deriveStatus(event: AgentEvent): AgentState["status"] {
  if (event.type === "status" && event.payload.content === "done") return "done";
  if (event.type === "status" && event.payload.content === "error") return "error";
  if (event.type === "commit") return "done";
  return "working";
}

const ALL_ROLES: AgentRole[] = ["pm", "backend", "frontend", "qa", "reviewer", "devops"];

export const useAgentStore = create<AgentStore>((set, get) => ({
  events: [],
  agents: Object.fromEntries(
    ALL_ROLES.map((r) => [r, initialAgentState()]),
  ) as Record<string, AgentState>,
  connected: false,
  connectionError: null,

  setConnected: (v) => set({ connected: v, connectionError: v ? null : get().connectionError }),
  setConnectionError: (err) => set({ connectionError: err }),

  addEvent: (event) =>
    set((state) => {
      const status = deriveStatus(event);
      // 새 이벤트가 도착하면 항상 해당 이벤트의 status 사용
      // auto-idle 전환은 useAgentSocket의 setInterval이 담당
      const resolvedStatus = status;

      return {
        events: [...state.events.slice(-200), event],
        agents: {
          ...state.agents,
          [event.agentId]: {
            status: resolvedStatus,
            lastEvent: event,
            doneAt: resolvedStatus === "done" ? new Date(event.timestamp).getTime() : null,
          },
        },
      };
    }),

  setReplay: (events) =>
    set((state) => {
      const agents = { ...state.agents };
      const capped = events.slice(-200);
      for (const event of capped) {
        const status = deriveStatus(event);
        agents[event.agentId] = {
          status,
          lastEvent: event,
          doneAt: status === "done" ? new Date(event.timestamp).getTime() : null,
        };
      }
      return { events: capped, agents };
    }),
}));
