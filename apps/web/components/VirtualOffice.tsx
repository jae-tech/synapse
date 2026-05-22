'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAgentSocket } from '@/lib/useAgentSocket';
import { useAgentStore, useGroupedAgents, extractRole } from '@/store/useAgentStore';
import { IssueInput } from './IssueInput';
import type { AgentPosition } from './PixelOffice';

const AgentTerminal = dynamic(() => import('./AgentTerminal').then((m) => m.AgentTerminal), {
  ssr: false,
});
const PixelOffice = dynamic(() => import('./PixelOffice').then((m) => m.PixelOffice), {
  ssr: false,
});

const AGENT_CONFIG: { role: string; label: string; emoji: string }[] = [
  { role: 'pm', label: 'PM', emoji: '🧠' },
  { role: 'backend', label: 'Backend', emoji: '⚙️' },
  { role: 'frontend', label: 'Frontend', emoji: '🎨' },
  { role: 'qa', label: 'QA', emoji: '🔍' },
  { role: 'reviewer', label: 'Reviewer', emoji: '📋' },
  { role: 'devops', label: 'DevOps', emoji: '🚀' },
];

const STATUS_LABEL: Record<string, string> = {
  idle: '대기',
  working: '작업 중',
  done: '완료',
  error: '오류',
};

const STATUS_COLOR: Record<string, string> = {
  idle: 'var(--color-idle)',
  working: 'var(--color-working)',
  done: 'var(--color-done)',
  error: 'var(--color-error)',
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

// 이벤트 타입별 아이콘과 레이블
const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
  'agent:start': { icon: '▶', label: '시작', color: '#30d970' },
  'agent:complete': { icon: '✓', label: '완료', color: '#30d970' },
  'agent:error': { icon: '✗', label: '오류', color: '#f87171' },
  tool_use: { icon: '⚙', label: '도구 호출', color: '#7eb8ff' },
  tool_result: { icon: '↩', label: '도구 결과', color: '#94a3b8' },
  thinking: { icon: '💭', label: '사고', color: '#c084fc' },
  status: { icon: '◉', label: '상태', color: '#fbbf24' },
  file_change: { icon: '📄', label: '파일 변경', color: '#22d3ee' },
  bash: { icon: '$', label: 'Bash', color: '#fbbf24' },
  commit: { icon: '⎇', label: '커밋', color: '#30d970' },
};

interface AgentEventLocal {
  id: string;
  agentId: string;
  type: string;
  tool?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// 이벤트에서 본문 한 줄 추출
function extractSummary(e: AgentEventLocal): string | null {
  const p = e.payload;
  switch (e.type) {
    case 'tool_use':
      // tool 필드 or payload.name, 입력 파일/명령 미리보기
      if (p['input'] && typeof p['input'] === 'object') {
        const inp = p['input'] as Record<string, unknown>;
        if (inp['command']) return String(inp['command']).slice(0, 120);
        if (inp['path']) return String(inp['path']);
        if (inp['file_path']) return String(inp['file_path']);
      }
      if (p['input']) return String(p['input']).slice(0, 120);
      return e.tool ?? null;
    case 'tool_result':
      if (p['content']) return String(p['content']).slice(0, 120);
      return null;
    case 'thinking':
      if (p['content']) return String(p['content']).slice(0, 160);
      return null;
    case 'status':
      if (p['content']) return String(p['content']);
      if (p['message']) return String(p['message']);
      return null;
    case 'file_change':
      if (p['path']) return String(p['path']);
      if (p['file']) return String(p['file']);
      return null;
    case 'bash':
      if (p['command']) return String(p['command']).slice(0, 120);
      if (p['cmd']) return String(p['cmd']).slice(0, 120);
      return null;
    case 'commit':
      if (p['message']) return String(p['message']).slice(0, 120);
      if (p['hash']) return String(p['hash']).slice(0, 12);
      return null;
    case 'agent:complete':
      if (p['durationMs']) return `${Math.round(Number(p['durationMs']) / 1000)}초 소요`;
      return null;
    case 'agent:error':
      if (p['error']) return String(p['error']).slice(0, 120);
      return null;
    default:
      return null;
  }
}

// URL hash에서 workspaceId 파싱 — #ws:my-project → "my-project", 없으면 "default"
function useWorkspaceId(): [string, (id: string) => void] {
  const [workspaceId, setWorkspaceIdState] = useState('default');

  useEffect(() => {
    function read() {
      const hash = window.location.hash;
      const match = hash.match(/^#ws:(.+)$/);
      setWorkspaceIdState(match ? decodeURIComponent(match[1]) : 'default');
    }
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  function setWorkspaceId(id: string) {
    const normalized = id.trim() || 'default';
    window.location.hash = normalized === 'default' ? '' : `ws:${encodeURIComponent(normalized)}`;
    setWorkspaceIdState(normalized);
  }

  return [workspaceId, setWorkspaceId];
}

export function VirtualOffice() {
  const [workspaceId, setWorkspaceId] = useWorkspaceId();
  useAgentSocket(workspaceId);

  const { events, connected, connectionError } = useAgentStore();
  const groupedAgents = useGroupedAgents();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [wsInput, setWsInput] = useState('');

  const activeCount = Object.values(groupedAgents).reduce(
    (sum, g) => sum + g.instances.filter((i) => i.status === 'working').length,
    0,
  );

  // PM이 working이고 다른 에이전트도 working이면 "대화 중" — 복도로 이동
  const pmWorking = groupedAgents['pm']?.summaryStatus === 'working';
  const anySubWorking = ['backend', 'frontend', 'qa', 'reviewer', 'devops'].some(
    (r) => groupedAgents[r]?.summaryStatus === 'working',
  );
  const isMeeting = pmWorking && anySubWorking;

  const agentPositions: AgentPosition[] = AGENT_CONFIG.map(({ role }) => ({
    role,
    status: groupedAgents[role]?.summaryStatus ?? 'idle',
    // PM은 배포 중에 다른 에이전트들과 대화, 서브에이전트는 PM이 active일 때 만남
    isTalking: isMeeting && (role === 'pm' || groupedAgents[role]?.summaryStatus === 'working'),
  }));

  // 우측 패널 이벤트: 선택된 role 또는 전체 최근 이벤트
  const selectedRole_ = selectedRole ? extractRole(selectedRole) : null;
  const panelEvents = selectedRole_
    ? events
        .filter((e) => e.agentId === selectedRole_ || e.agentId.startsWith(selectedRole_ + '-'))
        .slice(-50)
        .reverse()
    : events.slice(-30).reverse();

  const panelTitle = selectedRole_
    ? `${AGENT_CONFIG.find((a) => a.role === selectedRole_)?.label ?? selectedRole_} 로그`
    : '전체 이벤트';

  return (
    <div className="vo-root">
      {/* ── 헤더 ── */}
      <header className="vo-header">
        <h1 className="vo-logo">
          Synapse
          <span className="vo-logo-sub">AI Virtual Office</span>
        </h1>
        <div className="vo-header-right">
          {/* 워크스페이스 전환 */}
          <form
            className="vo-ws-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (wsInput.trim()) {
                setWorkspaceId(wsInput.trim());
                setWsInput('');
              }
            }}
          >
            <span className="vo-ws-label">ws:</span>
            <span className="vo-ws-current">{workspaceId}</span>
            <input
              className="vo-ws-input"
              value={wsInput}
              onChange={(e) => setWsInput(e.target.value)}
              placeholder="전환…"
              aria-label="워크스페이스 전환"
            />
          </form>
          <div
            className={`vo-conn-dot ${connected ? 'vo-conn-dot--connected' : 'vo-conn-dot--disconnected'}`}
          />
          <span className={connected ? 'vo-conn-label--connected' : 'vo-conn-label--disconnected'}>
            {connected ? '연결됨' : connectionError ? '연결 실패' : '연결 중...'}
          </span>
          {activeCount > 0 && <span className="vo-active-count">{activeCount}명 작업 중</span>}
        </div>
      </header>

      {/* 연결 에러 배너 */}
      {connectionError && !connected && (
        <div className="vo-error-banner">
          서버 연결 실패: {connectionError}. API가 실행 중인지 확인하세요 (localhost:3011).
        </div>
      )}

      {/* ── 3패널 메인 ── */}
      <div className="vo-three-panel">
        {/* ── 좌: 에이전트 리스트 ── */}
        <aside className="vo-agent-list">
          <div className="vo-panel-title">에이전트</div>
          <div className="vo-agent-list__scroll">
            {AGENT_CONFIG.map(({ role, label, emoji }) => {
              const group = groupedAgents[role];
              const status = group?.summaryStatus ?? 'idle';
              const isSelected = selectedRole === role;
              const lastEvent = group?.instances[0]?.lastEvent;

              return (
                <button
                  key={role}
                  className={`agent-row${isSelected ? ' agent-row--selected' : ''}`}
                  onClick={() => setSelectedRole(isSelected ? null : role)}
                >
                  <div className="agent-row__left">
                    <div
                      className={`agent-dot agent-dot--${status}`}
                      style={{ width: 8, height: 8 }}
                    />
                    <span className="agent-row__emoji">{emoji}</span>
                    <span className="agent-row__label">{label}</span>
                  </div>
                  <div className="agent-row__right">
                    <span
                      className="agent-row__status"
                      style={{ color: STATUS_COLOR[status] ?? 'inherit' }}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                    {group && group.instances.length >= 2 && (
                      <span className="agent-row__badge">×{group.instances.length}</span>
                    )}
                  </div>
                  {lastEvent && (
                    <div className="agent-row__hint">
                      {lastEvent.tool ?? lastEvent.type}
                      {lastEvent.payload['file'] &&
                        ` · ${String(lastEvent.payload['file']).split('/').pop()}`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {/* end scroll */}

          {/* IssueInput — 하단 고정 */}
          <div className="vo-agent-list__input">
            <IssueInput workspaceId={workspaceId} />
          </div>
        </aside>

        {/* ── 중: 픽셀아트 오피스 맵 ── */}
        <main className="vo-map-panel">
          {isMeeting && <div className="vo-meeting-badge">💬 에이전트 회의 중</div>}
          <div className="vo-map-scroll">
            <PixelOffice agents={agentPositions} />
          </div>
          {!connected && (
            <div className="vo-map-overlay">
              <span>서버 연결 대기 중…</span>
            </div>
          )}
        </main>

        {/* ── 우: 작업 로그 ── */}
        <aside className="vo-log-panel">
          <div className="vo-panel-title">
            {panelTitle}
            {selectedRole && (
              <button className="vo-log-panel__clear" onClick={() => setSelectedRole(null)}>
                전체 보기
              </button>
            )}
          </div>

          {/* 터미널 토글 */}
          {selectedRole && (
            <div className="vo-tabs" style={{ marginBottom: 'var(--space-2)' }}>
              <button
                className={`btn-ghost${!showTerminal ? ' btn-ghost--active' : ''}`}
                onClick={() => setShowTerminal(false)}
              >
                이벤트
              </button>
              <button
                className={`btn-ghost${showTerminal ? ' btn-ghost--active' : ''}`}
                onClick={() => setShowTerminal(true)}
              >
                터미널
              </button>
            </div>
          )}

          {showTerminal && selectedRole ? (
            <AgentTerminal agentId={selectedRole} />
          ) : (
            <div className="vo-log-list">
              {panelEvents.length === 0 ? (
                <div className="vo-log-empty">
                  {connected ? '이벤트 대기 중…' : '연결 후 표시됩니다'}
                </div>
              ) : (
                panelEvents.map((e) => {
                  const meta = EVENT_META[e.type] ?? { icon: '·', label: e.type, color: '#808090' };
                  const summary = extractSummary(e);
                  const toolName = e.tool ?? (e.payload['name'] ? String(e.payload['name']) : null);
                  return (
                    <div key={e.id || `${e.agentId}-${e.timestamp}`} className="vo-log-entry">
                      <div className="vo-log-entry__row">
                        <span className="vo-log-entry__icon" style={{ color: meta.color }}>
                          {meta.icon}
                        </span>
                        <span className="vo-log-entry__type" style={{ color: meta.color }}>
                          {toolName ?? meta.label}
                        </span>
                        <span className="vo-log-entry__agent">{e.agentId}</span>
                        <span className="vo-log-entry__time">{formatTime(e.timestamp)}</span>
                      </div>
                      {summary && (
                        <div className="vo-log-entry__summary">
                          {summary}
                          {summary.length >= 120 && '…'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
