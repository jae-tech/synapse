'use client';

import { useEffect, useRef } from 'react';
import { useAgentStore } from '@/store/useAgentStore';

interface Props {
  agentId: string;
}

// ANSI 이스케이프 → span 태그로 변환 (기본 16색 지원)
const ANSI_COLOR_MAP: Record<number, string> = {
  30: '#555568',
  31: '#f87171',
  32: '#30d970',
  33: '#fbbf24',
  34: '#7eb8ff',
  35: '#c084fc',
  36: '#22d3ee',
  37: '#d0d0e0',
  90: '#808090',
  91: '#fca5a5',
  92: '#86efac',
  93: '#fde68a',
  94: '#bfdbfe',
  95: '#e879f9',
  96: '#67e8f9',
  97: '#f0f0f2',
};

function ansiToHtml(raw: string): string {
  // 캐리지 리턴 처리: \r\n → \n, 단독 \r은 줄 덮어쓰기 (마지막 \r 이후만 유지)
  const crFixed = raw.replace(/\r\n/g, '\n').replace(/[^\n]*\r/g, '');

  let result = '';
  let i = 0;
  let openSpans = 0;

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  while (i < crFixed.length) {
    // ESC[ 시퀀스
    if (crFixed[i] === '\x1b' && crFixed[i + 1] === '[') {
      // 시퀀스 끝(알파벳) 찾기
      let j = i + 2;
      while (j < crFixed.length && !/[A-Za-z]/.test(crFixed[j])) j++;
      const cmd = crFixed[j];
      const params = crFixed
        .slice(i + 2, j)
        .split(';')
        .map(Number);

      if (cmd === 'm') {
        // SGR — 색상/스타일
        if (params[0] === 0 || params.length === 0) {
          // 리셋
          result += '</span>'.repeat(openSpans);
          openSpans = 0;
        } else {
          for (const code of params) {
            const fg = ANSI_COLOR_MAP[code];
            if (fg) {
              result += `<span style="color:${fg}">`;
              openSpans++;
            } else if (code === 1) {
              result += `<span style="font-weight:bold">`;
              openSpans++;
            }
          }
        }
      }
      // 커서 이동 등 다른 시퀀스는 무시
      i = j + 1;
    } else if (crFixed[i] === '\x1b') {
      // ESC 뒤 [ 없는 경우 스킵
      i++;
    } else {
      // 일반 텍스트
      let j = i;
      while (j < crFixed.length && crFixed[j] !== '\x1b') j++;
      result += esc(crFixed.slice(i, j));
      i = j;
    }
  }

  result += '</span>'.repeat(openSpans);
  return result;
}

export function AgentTerminal({ agentId }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const ptyBuffer = useAgentStore((s) => s.ptyBuffers[agentId] ?? '');

  // 새 출력이 올 때마다 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ptyBuffer]);

  const html = ansiToHtml(ptyBuffer);
  const isEmpty = ptyBuffer.trim().length === 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        background: '#141417',
        borderRadius: 6,
        border: '1px solid #333340',
      }}
    >
      {/* 상단 바 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderBottom: '1px solid #222230',
          flexShrink: 0,
        }}
      >
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d970' }} />
        <span style={{ marginLeft: 6, fontSize: 10, color: '#606070', fontFamily: 'monospace' }}>
          {agentId} · pty
        </span>
      </div>

      {/* 터미널 출력 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '8px 10px',
        }}
      >
        {isEmpty ? (
          <span style={{ color: '#50505e', fontSize: 12, fontFamily: 'monospace' }}>
            대기 중… 에이전트가 실행되면 출력이 표시됩니다.
          </span>
        ) : (
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.55,
              fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              color: '#e8e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
