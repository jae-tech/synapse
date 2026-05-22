'use client';

import React, { useEffect, useState } from 'react';

export type AgentStatus = 'idle' | 'working' | 'done' | 'error';

export interface AgentPosition {
  role: string;
  status: AgentStatus;
  isTalking: boolean;
}

interface Props {
  agents: AgentPosition[];
}

// 방 하나: 200×160px, 3개씩 2층
const ROOM_W = 200;
const ROOM_H = 160;
const WALL_T = 12; // 외벽 두께
const FLOOR_T = 16; // 층간 바닥 두께
const ROOF_H = 28; // 지붕 높이

const COLS = 3;
const ROWS = 2;
const TOTAL_W = COLS * ROOM_W + WALL_T * 2;
const TOTAL_H = ROOF_H + ROWS * ROOM_H + FLOOR_T * (ROWS - 1) + WALL_T + 20;

// [role, label, wallColor, floorColor, accentColor, furnitureSet]
const ROOM_DEFS: {
  role: string;
  label: string;
  wall: string;
  floor: string;
  accent: string;
  col: number;
  row: number;
}[] = [
  {
    role: 'pm',
    label: '기획실',
    wall: '#2d1f4e',
    floor: '#3a2a1a',
    accent: '#a78bfa',
    col: 0,
    row: 0,
  },
  {
    role: 'backend',
    label: '개발실 BE',
    wall: '#0e2040',
    floor: '#1a2a1a',
    accent: '#60a5fa',
    col: 1,
    row: 0,
  },
  {
    role: 'frontend',
    label: '개발실 FE',
    wall: '#0e2a18',
    floor: '#2a1a1a',
    accent: '#34d399',
    col: 2,
    row: 0,
  },
  {
    role: 'qa',
    label: '테스트실',
    wall: '#2a2000',
    floor: '#1a1a2a',
    accent: '#fbbf24',
    col: 0,
    row: 1,
  },
  {
    role: 'reviewer',
    label: '검토실',
    wall: '#2a0a2a',
    floor: '#2a1a10',
    accent: '#f472b6',
    col: 1,
    row: 1,
  },
  {
    role: 'devops',
    label: '배포실',
    wall: '#0a1a1a',
    floor: '#1a1212',
    accent: '#fb923c',
    col: 2,
    row: 1,
  },
];

const AGENT_COLOR: Record<string, string> = {
  pm: '#a78bfa',
  backend: '#60a5fa',
  frontend: '#34d399',
  qa: '#fbbf24',
  reviewer: '#f472b6',
  devops: '#fb923c',
};

const AGENT_LABEL: Record<string, string> = {
  pm: 'PM',
  backend: 'BE',
  frontend: 'FE',
  qa: 'QA',
  reviewer: 'RV',
  devops: 'DO',
};

function roomLeft(col: number) {
  return WALL_T + col * ROOM_W;
}
function roomTop(row: number) {
  return ROOF_H + row * (ROOM_H + FLOOR_T);
}

/* ── 픽셀 캐릭터 ─────────────────────────────────────────────── */
function Char({
  role,
  status,
  x,
  y,
  isTalking,
  frame,
}: {
  role: string;
  status: AgentStatus;
  x: number;
  y: number;
  isTalking: boolean;
  frame: number;
}) {
  const c = AGENT_COLOR[role] ?? '#aaa';
  const lbl = AGENT_LABEL[role] ?? role.slice(0, 2).toUpperCase();
  const isWorking = status === 'working';
  const isError = status === 'error';
  const isDone = status === 'done';
  const moving = isWorking || isTalking;
  const even = frame % 2 === 0;
  const bob = moving && even ? -2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 12,
        top: y - 44 + bob,
        width: 24,
        height: 56,
        transition: 'left 0.6s cubic-bezier(.4,0,.2,1), top 0.6s cubic-bezier(.4,0,.2,1)',
        zIndex: 30,
        imageRendering: 'pixelated',
      }}
    >
      {/* 말풍선 */}
      {isTalking && (
        <div
          style={{
            position: 'absolute',
            top: -18,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 12,
            filter: 'drop-shadow(0 1px 3px #000a)',
          }}
        >
          💬
        </div>
      )}
      {isError && !isTalking && (
        <div
          style={{
            position: 'absolute',
            top: -16,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
          }}
        >
          ❗
        </div>
      )}
      {isDone && !isTalking && (
        <div
          style={{
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            color: '#22c55e',
            fontWeight: 900,
          }}
        >
          ✓
        </div>
      )}

      {/* 머리 */}
      <div
        style={{
          width: 14,
          height: 14,
          margin: '0 auto',
          background: c,
          borderRadius: 3,
          position: 'relative',
          boxShadow: `inset -2px -3px 0 rgba(0,0,0,0.4), ${isWorking ? `0 0 10px 3px ${c}55` : ''}`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 2,
            width: 3,
            height: 3,
            background: '#111',
            borderRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 2,
            width: 3,
            height: 3,
            background: '#111',
            borderRadius: 1,
          }}
        />
        {isWorking && (
          <div
            style={{
              position: 'absolute',
              inset: -2,
              borderRadius: 4,
              boxShadow: `0 0 8px 4px ${c}44`,
              opacity: even ? 1 : 0.3,
              transition: 'opacity 0.28s',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* 목 */}
      <div style={{ width: 5, height: 4, margin: '0 auto', background: c, opacity: 0.6 }} />

      {/* 몸통 */}
      <div
        style={{
          width: 18,
          height: 14,
          margin: '0 auto',
          background: c,
          opacity: 0.85,
          borderRadius: '3px 3px 0 0',
          boxShadow: `inset -2px -3px 0 rgba(0,0,0,0.3)`,
        }}
      />

      {/* 다리 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 10,
              background: c,
              opacity: 0.7,
              borderRadius: '0 0 3px 3px',
              transform: `translateY(${moving && (i === 0 ? even : !even) ? 3 : 0}px)`,
              transition: 'transform 0.15s',
            }}
          />
        ))}
      </div>

      {/* 이름표 */}
      <div
        style={{
          position: 'absolute',
          bottom: -12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          color: c,
          whiteSpace: 'nowrap',
          fontFamily: '"Courier New", monospace',
          fontWeight: 800,
          textShadow: '0 0 6px #000, 0 0 3px #000',
        }}
      >
        {lbl}
      </div>
    </div>
  );
}

/* ── 방 컴포넌트 ────────────────────────────────────────────── */
function Room({
  def,
  active,
  frame,
}: {
  def: (typeof ROOM_DEFS)[0];
  active: boolean;
  frame: number;
}) {
  const left = roomLeft(def.col);
  const top = roomTop(def.row);
  const even = frame % 2 === 0;

  const hasBorder = (side: 'left' | 'right') => {
    if (side === 'left') return def.col > 0;
    return def.col < COLS - 1;
  };

  return (
    <>
      {/* 방 배경 (벽지) */}
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width: ROOM_W,
          height: ROOM_H,
          background: def.wall,
          boxSizing: 'border-box',
          borderLeft: hasBorder('left') ? `1px solid rgba(0,0,0,0.5)` : 'none',
          borderRight: hasBorder('right') ? `1px solid rgba(0,0,0,0.5)` : 'none',
          overflow: 'hidden',
        }}
      >
        {/* 벽지 패턴 (수직선 미묘하게) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 20px)',
            pointerEvents: 'none',
          }}
        />

        {/* 바닥 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: 32,
            background: def.floor,
            borderTop: `2px solid rgba(255,255,255,0.08)`,
          }}
        >
          {/* 마루 패턴 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 24px)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* 창문 */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: 20,
            width: 44,
            height: 44,
            background: active ? `linear-gradient(135deg, ${def.accent}18, #0a1830)` : '#050d1a',
            border: `3px solid #4a3a28`,
            borderRadius: 2,
            boxShadow: `inset 0 0 8px rgba(0,0,0,0.6), ${active ? `0 0 12px ${def.accent}30` : ''}`,
            overflow: 'hidden',
          }}
        >
          {/* 창문 격자 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              background: '#4a3a2866',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 2,
              background: '#4a3a2866',
            }}
          />
          {/* 햇빛 효과 */}
          {active && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `radial-gradient(circle at 30% 30%, ${def.accent}20, transparent 70%)`,
                opacity: even ? 1 : 0.6,
                transition: 'opacity 0.5s',
              }}
            />
          )}
        </div>

        {/* 방 이름 현판 */}
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            padding: '2px 6px',
            background: 'rgba(0,0,0,0.55)',
            border: `1px solid ${def.accent}66`,
            borderRadius: 3,
            fontSize: 9,
            color: def.accent,
            fontFamily: '"Courier New", monospace',
            fontWeight: 700,
            letterSpacing: 1,
            textShadow: `0 0 6px ${def.accent}`,
          }}
        >
          {def.label}
        </div>

        {/* 활성 LED */}
        <div
          style={{
            position: 'absolute',
            right: 10,
            top: 36,
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: active ? def.accent : '#333',
            boxShadow: active ? `0 0 6px ${def.accent}` : 'none',
            opacity: active ? (even ? 1 : 0.4) : 0.3,
            transition: 'opacity 0.28s',
          }}
        />

        {/* ── 가구 세트 ── */}
        {/* 책상 (바닥 위) */}
        <div
          style={{
            position: 'absolute',
            left: 66,
            bottom: 32,
            width: 96,
            height: 18,
            background: '#2e2010',
            borderRadius: '3px 3px 0 0',
            border: '1px solid #3e3018',
            boxShadow: `inset 0 3px 0 rgba(255,255,255,0.07), 0 2px 4px rgba(0,0,0,0.5)`,
          }}
        />
        {/* 책상 다리 */}
        {[72, 150].map((x) => (
          <div
            key={x}
            style={{
              position: 'absolute',
              left: x,
              bottom: 32,
              width: 5,
              height: 18,
              background: '#1e1408',
              borderRadius: '0 0 2px 2px',
            }}
          />
        ))}

        {/* 모니터 */}
        <div
          style={{
            position: 'absolute',
            left: 86,
            bottom: 50,
            width: 52,
            height: 36,
            background: '#0d0d0d',
            border: `2px solid #2a2a2a`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              margin: 3,
              height: 'calc(100% - 6px)',
              background: active
                ? `linear-gradient(160deg, ${def.accent}1a 0%, #050a14 100%)`
                : '#070707',
              borderRadius: 2,
              transition: 'background 0.6s',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {active &&
              [0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 3,
                    top: 4 + i * 6,
                    height: 2,
                    width: `${(even ? 55 : 75) - i * 12}%`,
                    background: def.accent,
                    opacity: 0.5 - i * 0.07,
                    transition: 'width 0.4s',
                    borderRadius: 1,
                  }}
                />
              ))}
          </div>
        </div>
        {/* 모니터 받침 */}
        <div
          style={{
            position: 'absolute',
            left: 106,
            bottom: 49,
            width: 12,
            height: 3,
            background: '#222',
            borderRadius: 1,
          }}
        />

        {/* 키보드 */}
        <div
          style={{
            position: 'absolute',
            left: 90,
            bottom: 50,
            width: 42,
            height: 8,
            background: '#181818',
            border: '1px solid #2a2a2a',
            borderRadius: 2,
          }}
        >
          {[0, 1].map((row_) => (
            <div
              key={row_}
              style={{ display: 'flex', gap: 1, margin: `${row_ === 0 ? 1 : 0}px 2px 0` }}
            >
              {Array.from({ length: row_ === 0 ? 8 : 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{ width: 3, height: 2, background: '#2e2e2e', borderRadius: 1 }}
                />
              ))}
            </div>
          ))}
        </div>

        {/* 커피컵 */}
        <div
          style={{
            position: 'absolute',
            left: 68,
            bottom: 50,
            width: 10,
            height: 12,
            background: '#3e2c18',
            borderRadius: '0 0 4px 4px',
            border: '1px solid #50381e',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -3,
              left: -1,
              right: -1,
              height: 5,
              background: '#241408',
              borderRadius: '2px 2px 0 0',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: -5,
              top: 3,
              width: 4,
              height: 5,
              border: '2px solid #50381e',
              borderRadius: '0 3px 3px 0',
              borderLeft: 'none',
            }}
          />
        </div>

        {/* 책장 (왼쪽 벽) */}
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 32,
            width: 16,
            height: 56,
            background: '#1e1408',
            border: '1px solid #2e2010',
            borderRadius: 2,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 2,
                top: 3 + i * 10,
                right: 2,
                height: 8,
                background: `hsl(${(i * 60 + parseInt(def.accent.slice(1), 16)) % 360}, 40%, 30%)`,
                borderRadius: 1,
              }}
            />
          ))}
        </div>

        {/* 화이트보드 / 그림 (벽 상단) */}
        <div
          style={{
            position: 'absolute',
            left: 66,
            top: 16,
            width: 52,
            height: 36,
            background: '#f4f0e0',
            border: `2px solid #6a5030`,
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: `${def.accent}12` }} />
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 2,
                margin: `5px 5px 0`,
                background: `${def.accent}99`,
                borderRadius: 1,
                width: `${65 - i * 12}%`,
              }}
            />
          ))}
        </div>
        {/* 액자 프레임 */}
        <div
          style={{
            position: 'absolute',
            left: 64,
            top: 14,
            width: 56,
            height: 40,
            border: `3px solid #6a5030`,
            borderRadius: 2,
            pointerEvents: 'none',
            boxShadow: `inset 0 0 4px rgba(0,0,0,0.5)`,
          }}
        />

        {/* 의자 */}
        <div
          style={{
            position: 'absolute',
            left: 102,
            bottom: 32,
            width: 28,
            height: 24,
            background: '#111',
            borderRadius: '50% 50% 30% 30%',
            border: '1px solid #222',
            boxShadow: `0 4px 8px rgba(0,0,0,0.6)`,
          }}
        />
        {/* 의자 등받이 */}
        <div
          style={{
            position: 'absolute',
            left: 109,
            bottom: 52,
            width: 14,
            height: 20,
            background: '#0e0e0e',
            border: '1px solid #1e1e1e',
            borderRadius: '3px 3px 0 0',
          }}
        />

        {/* 화분 (오른쪽 코너) */}
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 32,
          }}
        >
          {/* 잎 */}
          <div
            style={{
              width: 22,
              height: 22,
              background: `radial-gradient(circle, #1a5a18, #0d3a0c)`,
              borderRadius: '50% 50% 40% 40%',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 1,
                height: 14,
                background: '#2a7a28',
                opacity: 0.4,
              }}
            />
          </div>
          {/* 화분 */}
          <div
            style={{
              width: 16,
              height: 12,
              background: `linear-gradient(to bottom, #5a3a1a, #3a2010)`,
              margin: '-2px auto 0',
              borderRadius: '0 0 4px 4px',
              border: '1px solid #6a4820',
            }}
          />
        </div>
      </div>
    </>
  );
}

/* ── 외벽 / 건물 외관 ────────────────────────────────────────── */
function Building() {
  // 벽돌 패턴
  const brickRows = Math.ceil(TOTAL_H / 10);
  return (
    <>
      {/* 배경 하늘 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, #0a1628 0%, #142236 60%, #1a2a40 100%)',
        }}
      />

      {/* 지붕 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: TOTAL_W,
          height: ROOF_H + 4,
          background: 'linear-gradient(to bottom, #2a1a0e, #3a2818)',
          borderBottom: '3px solid #4a3822',
          overflow: 'hidden',
        }}
      >
        {/* 지붕 타일 패턴 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 16px)',
            backgroundSize: '16px 100%',
          }}
        />
        {/* 굴뚝 */}
        <div
          style={{
            position: 'absolute',
            left: TOTAL_W * 0.25,
            top: -10,
            width: 20,
            height: 22,
            background: '#3a2818',
            border: '2px solid #4a3822',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: TOTAL_W * 0.75 - 10,
            top: -8,
            width: 16,
            height: 20,
            background: '#3a2818',
            border: '2px solid #4a3822',
          }}
        />
      </div>

      {/* 좌측 외벽 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: ROOF_H,
          width: WALL_T,
          height: TOTAL_H - ROOF_H,
          background: '#2a1e10',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 10px)',
          borderRight: '2px solid #3a2818',
        }}
      />

      {/* 우측 외벽 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: ROOF_H,
          width: WALL_T,
          height: TOTAL_H - ROOF_H,
          background: '#2a1e10',
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.25) 0px, rgba(0,0,0,0.25) 1px, transparent 1px, transparent 10px)',
          borderLeft: '2px solid #3a2818',
        }}
      />

      {/* 바닥 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: TOTAL_W,
          height: 20,
          background: 'linear-gradient(to bottom, #1a1208, #0e0a04)',
          borderTop: '3px solid #3a2818',
        }}
      />

      {/* 층간 바닥 (1층과 2층 사이) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: ROOF_H + ROOM_H,
          width: TOTAL_W,
          height: FLOOR_T,
          background: 'linear-gradient(to bottom, #3a2818, #2a1e10)',
          borderTop: '2px solid #4a3822',
          borderBottom: '2px solid #4a3822',
          overflow: 'hidden',
        }}
      >
        {/* 층간 벽돌 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 1px, transparent 1px, transparent 24px)',
          }}
        />
      </div>
    </>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────────────────── */
export function PixelOffice({ agents }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => f + 1), 280);
    return () => clearInterval(id);
  }, []);

  const agentMap = Object.fromEntries(agents.map((a) => [a.role, a]));
  const talkingRoles = agents.filter((a) => a.isTalking).map((a) => a.role);

  // 복도 위치 — 층간 바닥 아래 (1층 로비 느낌)
  const lobbyY = ROOF_H + ROOM_H + FLOOR_T / 2;
  const lobbyXs = [TOTAL_W * 0.2, TOTAL_W * 0.5, TOTAL_W * 0.8];

  return (
    <div
      style={{
        position: 'relative',
        width: TOTAL_W,
        height: TOTAL_H,
        overflow: 'hidden',
        imageRendering: 'pixelated',
        flexShrink: 0,
        borderRadius: 4,
        boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
      }}
    >
      {/* 건물 외관 */}
      <Building />

      {/* 방들 */}
      {ROOM_DEFS.map((def) => (
        <Room
          key={def.role}
          def={def}
          active={agentMap[def.role]?.status === 'working'}
          frame={frame}
        />
      ))}

      {/* 캐릭터들 */}
      {ROOM_DEFS.map((def, idx) => {
        const agent = agentMap[def.role];
        if (!agent) return null;

        let cx: number;
        let cy: number;

        if (agent.isTalking) {
          const talkIdx = talkingRoles.indexOf(def.role);
          cx = lobbyXs[Math.min(talkIdx, lobbyXs.length - 1)];
          cy = lobbyY + 10;
        } else {
          // 책상 앞 (방 중앙 오른쪽)
          cx = roomLeft(def.col) + 120;
          cy = roomTop(def.row) + ROOM_H - 36;
        }

        return (
          <Char
            key={def.role}
            role={def.role}
            status={agent.status}
            x={cx}
            y={cy}
            isTalking={agent.isTalking}
            frame={frame}
          />
        );
      })}

      {/* 회의 오라 */}
      {talkingRoles.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            left: TOTAL_W * 0.1,
            top: ROOF_H + ROOM_H - 10,
            width: TOTAL_W * 0.8,
            height: FLOOR_T + 30,
            background:
              'radial-gradient(ellipse at center, rgba(59,130,246,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
