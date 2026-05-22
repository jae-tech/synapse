'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { AgentEvent } from '@synapse/schemas';
import { useAgentStore, DONE_IDLE_TIMEOUT_MS } from '@/store/useAgentStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011';
const IDLE_CHECK_INTERVAL_MS = 60 * 1000; // 1분마다 체크

export function useAgentSocket(workspaceId = 'default') {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const store = useAgentStore.getState;
    if (window.location.search.includes('e2e_socket_error=1')) {
      // E2E에서 연결 실패 UI를 안정적으로 검증하기 위한 강제 분기
      store().setConnected(false);
      store().setConnectionError('E2E forced socket error');
      return;
    }

    const socket = io(API_URL, {
      query: { workspaceId },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      store().setConnected(true);
      store().setConnectionError(null);
    });
    socket.on('disconnect', () => store().setConnected(false));
    socket.on('connect_error', (err) => store().setConnectionError(err.message));

    // replay 수신 시각 기록 — 이 시각 이전 timestamp의 live 이벤트는 무시 (경쟁 조건 방지)
    let replayEndTimestamp = 0;
    socket.on('replay', (events: AgentEvent[]) => {
      store().setReplay(events);
      // replay 배열의 마지막 이벤트 시각을 기준으로 설정
      const last = events[events.length - 1];
      replayEndTimestamp = last ? new Date(last.timestamp).getTime() : Date.now();
    });
    socket.on('agent_event', (event: AgentEvent) => {
      // replay보다 오래된 이벤트는 UI 롤백을 유발하므로 무시
      if (new Date(event.timestamp).getTime() >= replayEndTimestamp) {
        store().addEvent(event);
      }
    });

    socket.on('pty:data', ({ agentId, data }: { agentId: string; data: string }) => {
      store().appendPty(agentId, data);
    });

    // done 후 30분 경과 시 idle로 전환 (addEvent에서 처리하지 않아 별도 처리)
    const idleTimer = setInterval(() => {
      const now = Date.now();
      const { agents } = store();
      const updates: Record<
        string,
        { status: 'idle'; lastEvent: (typeof agents)[string]['lastEvent']; doneAt: null }
      > = {};
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
  }, [workspaceId]); // workspaceId 변경 시 재연결 — store 함수는 직접 참조해 루프 방지
}
