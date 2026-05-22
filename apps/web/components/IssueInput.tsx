'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3011';

export function IssueInput() {
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = issue.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setSubmitted(false);

    try {
      const res = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue: trimmed, workspaceId: 'default' }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`서버 오류 ${res.status}${text ? ': ' + text : ''}`);
      }

      setIssue('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <textarea
          value={issue}
          onChange={(e) => {
            setIssue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            // Ctrl+Enter 또는 Cmd+Enter로 제출
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="구현할 이슈를 입력하세요… (Ctrl+Enter로 제출)"
          disabled={loading}
          rows={2}
          style={{
            flex: 1,
            background: '#111',
            border: `1px solid ${error ? '#4a0000' : '#2a2a2a'}`,
            borderRadius: '8px',
            color: '#e5e5e5',
            fontSize: '13px',
            padding: '10px 12px',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: '1.5',
          }}
        />
        <button
          type="submit"
          disabled={loading || !issue.trim()}
          style={{
            background: loading ? '#1a2a4a' : '#1e3a5f',
            border: '1px solid #2a4a7f',
            borderRadius: '8px',
            color: loading ? '#555' : '#60a5fa',
            fontSize: '12px',
            fontWeight: 600,
            padding: '0 16px',
            cursor: loading || !issue.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
            alignSelf: 'stretch',
          }}
        >
          {loading ? '전송 중…' : '실행'}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: '11px', color: '#ef4444', paddingLeft: '4px' }}>{error}</div>
      )}
      {submitted && (
        <div style={{ fontSize: '11px', color: '#22c55e', paddingLeft: '4px' }}>
          이슈가 전달됐습니다. 에이전트가 작업을 시작합니다.
        </div>
      )}
    </form>
  );
}
