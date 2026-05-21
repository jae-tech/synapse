'use client';

import { useState } from 'react';
import type { AgentRole } from '@synapse/schemas';
import { useAgentSocket } from '../lib/useAgentSocket';
import { useAgentStore } from '../store/useAgentStore';

const AGENT_CONFIG: { role: AgentRole; label: string; room: string }[] = [
  { role: 'pm', label: 'PM', room: '기획실' },
  { role: 'backend', label: 'Backend', room: '개발실' },
  { role: 'frontend', label: 'Frontend', room: '개발실' },
  { role: 'qa', label: 'QA', room: '테스트실' },
  { role: 'reviewer', label: 'Reviewer', room: '검토실' },
  { role: 'devops', label: 'DevOps', room: '배포실' },
];

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

export function VirtualOffice() {
  useAgentSocket();

  const { agents, events, connected, connectionError } = useAgentStore();
  const [selectedAgent, setSelectedAgent] = useState<AgentRole | null>(null);

  const activeCount = Object.values(agents).filter((a) => a.status === 'working').length;
  const hasAnyActivity = events.length > 0;

  const selectedEvents = selectedAgent
    ? events.filter((e) => e.agentId === selectedAgent).slice(-50).reverse()
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '24px', gap: '20px' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          Synapse
          <span style={{ fontSize: '13px', fontWeight: 400, color: '#666', marginLeft: '8px' }}>
            AI Virtual Office
          </span>
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            backgroundColor: connected ? '#22c55e' : '#4a4a4a',
          }} />
          <span style={{ color: connected ? '#22c55e' : '#666' }}>
            {connected ? '연결됨' : connectionError ? '연결 실패' : '연결 중...'}
          </span>
          {activeCount > 0 && (
            <span style={{ color: '#3b82f6', marginLeft: '8px' }}>
              {activeCount}명 작업 중
            </span>
          )}
        </div>
      </div>

      {/* 연결 에러 배너 */}
      {connectionError && !connected && (
        <div style={{
          padding: '10px 14px',
          background: '#1a0000',
          border: '1px solid #4a0000',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#ef4444',
        }}>
          서버 연결 실패: {connectionError}. API가 실행 중인지 확인하세요 (localhost:3011).
        </div>
      )}

      {/* 메인 영역 */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Virtual Office */}
        <div style={{
          flex: 1,
          border: '1px solid #222',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          opacity: connected ? 1 : 0.5,
          transition: 'opacity 0.3s',
        }}>
          {/* 에이전트 그리드 — CTA보다 위에 항상 렌더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {AGENT_CONFIG.map(({ role, label, room }) => {
              const agent = agents[role] ?? { status: 'idle', lastEvent: null };
              const isSelected = selectedAgent === role;

              return (
                <button
                  key={role}
                  onClick={() => setSelectedAgent(isSelected ? null : role)}
                  style={{
                    background: isSelected ? '#1a1a2e' : '#111',
                    border: `1px solid ${isSelected ? '#3b82f6' : '#222'}`,
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    textAlign: 'left',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className={`agent-dot ${agent.status}`} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#555' }}>{room}</div>
                  {agent.lastEvent ? (
                    <div style={{
                      fontSize: '11px',
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {agent.lastEvent.tool ?? agent.lastEvent.type}
                      {agent.lastEvent.payload.file && ` · ${agent.lastEvent.payload.file.split('/').pop()}`}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#333', fontStyle: 'italic' }}>
                      이번 세션 작업 없음
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* CTA: 활동 없을 때 그리드 아래에 표시 */}
          {!hasAnyActivity && (
            <div style={{
              textAlign: 'center',
              color: '#555',
              fontSize: '13px',
              lineHeight: '1.6',
              padding: '12px',
              border: '1px dashed #2a2a2a',
              borderRadius: '8px',
            }}>
              에이전트들이 대기 중입니다.<br />
              Claude Code를 실행하면 작업이 시작됩니다.
            </div>
          )}
        </div>

        {/* 이벤트 로그 패널 */}
        {selectedAgent && (
          <div style={{
            width: '320px',
            border: '1px solid #222',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflow: 'hidden',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#999' }}>
              {AGENT_CONFIG.find((a) => a.role === selectedAgent)?.label} 로그
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedEvents.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#444', fontStyle: 'italic' }}>이번 세션 이벤트 없음</div>
              ) : (
                selectedEvents.map((e) => (
                  <div key={e.id ?? `${e.agentId}-${e.timestamp}`} style={{
                    fontSize: '11px',
                    color: '#888',
                    borderLeft: '2px solid #222',
                    paddingLeft: '8px',
                    lineHeight: '1.5',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ color: '#3b82f6' }}>{e.tool ?? e.type}</span>
                      <span style={{ color: '#444', fontSize: '10px' }}>{formatTime(e.timestamp)}</span>
                    </div>
                    {e.payload.file && (
                      <span style={{ color: '#555' }}>{e.payload.file}</span>
                    )}
                    {e.payload.input && (
                      <div style={{ color: '#555', marginTop: '2px' }}>
                        {e.payload.input.slice(0, 80)}{e.payload.input.length > 80 && '…'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
