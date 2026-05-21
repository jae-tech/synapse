'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentEvent } from '@synapse/schemas';
import { useAgentStore, DONE_IDLE_TIMEOUT_MS } from '../store/useAgentStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011';
const IDLE_CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 체크

export function useAgentSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const store = useAgentStore.getState;

    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      store().setConnected(true);
      store().setConnectionError(null);
    });
    socket.on('disconnect', () => store().setConnected(false));
    socket.on('connect_error', (err) => store().setConnectionError(err.message));

    socket.on('replay', (events: AgentEvent[]) => store().setReplay(events));
    socket.on('agent_event', (event: AgentEvent) => store().addEvent(event));

    // done 후 30분 경과 시 idle로 전환 (addEvent에서 처리하지 않아 별도 처리)
    const idleTimer = setInterval(() => {
      const now = Date.now();
      const { agents } = store();
      const updates: Record<string, { status: 'idle'; lastEvent: typeof agents[string]['lastEvent']; doneAt: null }> = {};
      for (const [id, agent] of Object.entries(agents)) {
        if (
          agent.status === 'done' &&
          agent.doneAt !== null &&
          now - agent.doneAt > DONE_IDLE_TIMEOUT_MS
        ) {
          updates[id] = { status: 'idle', lastEvent: agent.lastEvent, doneAt: null };
        }
      }
      if (Object.keys(updates).length > 0) {
        useAgentStore.setState((s) => ({
          agents: { ...s.agents, ...updates },
        }));
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      socket.disconnect();
      socketRef.current = null;
      clearInterval(idleTimer);
    };
  }, []); // deps []로 고정 — store 함수를 직접 참조해 재연결 루프 방지
}
