'use client';

import { useEffect, useRef } from 'react';
import { useAgentStore } from '@/store/useAgentStore';

interface Props {
  agentId: string;
}

// xterm.js는 DOM API에 의존 — 클라이언트 사이드에서만 로드
export function AgentTerminal({ agentId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<import('@xterm/xterm').Terminal | null>(null);
  const fitRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null);
  const lastLenRef = useRef(0);

  // xterm 인스턴스 초기화 (마운트 1회)
  useEffect(() => {
    let term: import('@xterm/xterm').Terminal;
    let fit: import('@xterm/addon-fit').FitAddon;

    Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')]).then(
      ([{ Terminal }, { FitAddon }]) => {
        if (!containerRef.current) return;

        term = new Terminal({
          theme: { background: '#0d0d0d', foreground: '#d4d4d4' },
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          fontSize: 12,
          cursorBlink: false,
          scrollback: 2000,
          disableStdin: true,
        });

        fit = new FitAddon();
        term.loadAddon(fit);
        term.open(containerRef.current);
        fit.fit();

        termRef.current = term;
        fitRef.current = fit;

        // 초기 버퍼 반영
        const buf = useAgentStore.getState().ptyBuffers[agentId] ?? '';
        if (buf) {
          term.write(buf);
          lastLenRef.current = buf.length;
        }
      },
    );

    const handleResize = () => fitRef.current?.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      termRef.current?.dispose();
      termRef.current = null;
      fitRef.current = null;
      lastLenRef.current = 0;
    };
  }, [agentId]);

  // pty 버퍼 변화 감지 → 증분만 xterm에 write
  const ptyBuffer = useAgentStore((s) => s.ptyBuffers[agentId] ?? '');
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    if (ptyBuffer.length > lastLenRef.current) {
      term.write(ptyBuffer.slice(lastLenRef.current));
      lastLenRef.current = ptyBuffer.length;
    } else if (ptyBuffer.length === 0 && lastLenRef.current > 0) {
      // 버퍼 리셋 시 화면 초기화
      term.reset();
      lastLenRef.current = 0;
    }
  }, [ptyBuffer]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{ fontSize: '11px', color: '#555', marginBottom: '6px', fontFamily: 'monospace' }}
      >
        {agentId} · pty
      </div>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          borderRadius: '6px',
          overflow: 'hidden',
          background: '#0d0d0d',
        }}
      />
    </div>
  );
}
