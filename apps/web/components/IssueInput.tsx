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
    <form onSubmit={handleSubmit} className="issue-form">
      <div className="issue-form__row">
        <textarea
          value={issue}
          onChange={(e) => {
            setIssue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          placeholder="구현할 이슈를 입력하세요… (Ctrl+Enter로 제출)"
          disabled={loading}
          rows={2}
          className={`issue-textarea${error ? ' issue-textarea--error' : ''}`}
        />
        <button type="submit" disabled={loading || !issue.trim()} className="issue-btn">
          {loading ? '전송 중…' : '실행'}
        </button>
      </div>

      {error && <div className="issue-form__error">{error}</div>}
      {submitted && (
        <div className="issue-form__success">
          이슈가 전달됐습니다. 에이전트가 작업을 시작합니다.
        </div>
      )}
    </form>
  );
}
