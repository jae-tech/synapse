'use client';

import React, { useEffect, useMemo, useState } from 'react';

export type AgentStatus = 'idle' | 'working' | 'done' | 'error';

export interface AgentPosition {
  role: string;
  status: AgentStatus;
  isTalking: boolean;
}

interface Props {
  agents: AgentPosition[];
}

const WIDTH = 1100;
const HEIGHT = 820;

const AGENT_COLORS: Record<string, string> = {
  pm: '#8f79ff',
  backend: '#4d96ff',
  frontend: '#2cd79f',
  qa: '#ffbf3f',
  reviewer: '#ff6ad8',
  devops: '#ff944e',
};

const ROOM_BAR: Record<string, string> = {
  backend: '#2f76ff',
  frontend: '#1ac77f',
  qa: '#f0b429',
  reviewer: '#e441c8',
  devops: '#ff8738',
};

const ROOM_LAYOUT = [
  { role: 'backend', label: '개발실 BE', x: 34, y: 354, w: 206, h: 236 },
  { role: 'frontend', label: '개발실 FE', x: 244, y: 354, w: 206, h: 236 },
  { role: 'qa', label: '테스트실', x: 454, y: 354, w: 206, h: 236 },
  { role: 'reviewer', label: '검토실', x: 664, y: 354, w: 206, h: 236 },
  { role: 'devops', label: '배포실', x: 874, y: 354, w: 192, h: 236 },
];

function charPosition(role: string, isTalking: boolean): { x: number; y: number } {
  if (role === 'pm') return isTalking ? { x: 760, y: 248 } : { x: 548, y: 700 };
  const room = ROOM_LAYOUT.find((r) => r.role === role);
  if (!room) return { x: 540, y: 650 };
  if (isTalking) return { x: 730 + (room.x % 100), y: 248 };
  return { x: room.x + room.w / 2, y: room.y + room.h - 45 };
}

function PixelChar({
  role,
  status,
  x,
  y,
  frame,
  isTalking,
}: {
  role: string;
  status: AgentStatus;
  x: number;
  y: number;
  frame: number;
  isTalking: boolean;
}) {
  const color = AGENT_COLORS[role] ?? '#cccccc';
  const walking = status === 'working' || isTalking;
  const bob = walking && frame % 2 === 0 ? -2 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 14,
        top: y - 50 + bob,
        width: 28,
        height: 60,
        zIndex: 20,
        transition: 'all 0.55s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {isTalking && (
        <div style={{ position: 'absolute', top: -14, left: 9, fontSize: 10, color: '#a7ceff' }}>
          ●
        </div>
      )}
      <div
        style={{
          width: 16,
          height: 16,
          margin: '0 auto',
          borderRadius: 3,
          background: color,
          boxShadow: `inset -2px -3px 0 #0007, ${status === 'working' ? `0 0 10px ${color}` : ''}`,
        }}
      />
      <div
        style={{
          width: 20,
          height: 16,
          margin: '2px auto 0',
          borderRadius: 3,
          background: `${color}d0`,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
        <div
          style={{
            width: 7,
            height: 12,
            borderRadius: 2,
            background: `${color}bb`,
            transform: `translateY(${walking && frame % 2 === 0 ? 2 : 0}px)`,
          }}
        />
        <div
          style={{
            width: 7,
            height: 12,
            borderRadius: 2,
            background: `${color}bb`,
            transform: `translateY(${walking && frame % 2 === 1 ? 2 : 0}px)`,
          }}
        />
      </div>
    </div>
  );
}

function WorkRoom({
  x,
  y,
  w,
  h,
  label,
  color,
  active,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        border: '2px solid #2f3d58',
        background: 'linear-gradient(180deg, #15253f 0%, #0f1a30 65%, #0d1629 100%)',
        boxShadow: `inset 0 0 0 1px #ffffff0d, ${active ? `0 0 18px ${color}44` : 'none'}`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 18,
          right: 18,
          top: -2,
          height: 28,
          border: `2px solid ${color}`,
          borderRadius: 3,
          background: '#0d1a2fcc',
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 42,
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#f6cd6a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 72,
          top: 88,
          width: w - 98,
          height: 66,
          border: '2px solid #2e466c',
          background: '#060e1c',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 78,
          top: 94,
          width: w - 110,
          height: 54,
          background: `${color}14`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          top: h - 72,
          width: w - 90,
          height: 22,
          border: '2px solid #2c1f12',
          background: '#46301a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 14,
          height: 24,
          borderRadius: 3,
          background: '#20492d',
        }}
      />
    </div>
  );
}

export function PixelOffice({ agents }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((v) => v + 1), 260);
    return () => clearInterval(id);
  }, []);

  const map = useMemo(() => Object.fromEntries(agents.map((a) => [a.role, a])), [agents]);

  return (
    <div
      style={{
        position: 'relative',
        width: WIDTH,
        height: HEIGHT,
        flexShrink: 0,
        borderRadius: 6,
        overflow: 'hidden',
        imageRendering: 'pixelated',
        border: '2px solid #2c3b56',
        boxShadow: '0 16px 42px #000a, inset 0 0 0 1px #ffffff14',
        background:
          'radial-gradient(1200px 500px at 50% -120px, #345a8f44 0%, transparent 65%), linear-gradient(180deg, #1a2f4f 0%, #141f35 35%, #111a2d 100%)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 16,
          border: '2px solid #314662',
          background: 'linear-gradient(180deg, #27344a 0%, #1d283e 44%, #1a2337 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 22,
          width: 310,
          height: 60,
          border: '2px solid #34507a',
          background: '#0d192d',
          color: '#e3f0ff',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 20,
          fontWeight: 900,
          fontSize: 38,
        }}
      >
        SYNAPSE HQ
      </div>

      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 92,
          width: 256,
          height: 208,
          border: '2px solid #2f4569',
          background: '#0c1628',
        }}
      >
        <div style={{ color: '#58a0ff', fontSize: 28, fontWeight: 800, padding: '14px 16px 4px' }}>
          PROJECT STATUS
        </div>
        {[
          ['BACKEND', 75, '#4d96ff'],
          ['FRONTEND', 60, '#2cd79f'],
          ['QA', 40, '#f0b429'],
          ['DEPLOY', 20, '#ff944e'],
        ].map(([n, v, c], i) => (
          <div
            key={String(n)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 16px',
              color: '#d0def7',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <div style={{ width: 126 }}>{n}</div>
            <div style={{ width: 92, height: 12, background: '#1a2740', borderRadius: 999 }}>
              <div
                style={{ width: `${v}%`, height: '100%', borderRadius: 999, background: String(c) }}
              />
            </div>
            <div>{i === 0 ? '75%' : i === 1 ? '60%' : i === 2 ? '40%' : '20%'}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 326,
          top: 92,
          width: 164,
          height: 230,
          border: '2px solid #3f5f88',
          background: '#17325855',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 498,
          top: 92,
          width: 8,
          height: 250,
          background: '#314869',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 332,
          top: 36,
          width: 152,
          height: 38,
          border: '2px solid #78613a',
          background: '#17120d',
          color: '#f6c15f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: 22,
        }}
      >
        MEETING ROOM
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={`ceiling-light-${i}`}
          style={{
            position: 'absolute',
            left: 440 + i * 150,
            top: 24,
            width: 42,
            height: 8,
            borderRadius: 99,
            background: '#ffcf7b',
            boxShadow: '0 0 16px #ffcf7b99',
            opacity: i % 2 === frame % 2 ? 0.85 : 0.65,
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 520,
          top: 108,
          width: 280,
          height: 144,
          border: '3px solid #d9c9aa',
          background: '#f2e4cc',
          color: '#433322',
          fontWeight: 800,
          fontSize: 26,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 10,
        }}
      >
        SPRINT PLAN
      </div>
      <div
        style={{
          position: 'absolute',
          left: 604,
          top: 76,
          width: 54,
          height: 54,
          borderRadius: '50%',
          border: '4px solid #1d2430',
          background: '#f8f2dd',
          zIndex: 3,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 25,
            top: 10,
            width: 3,
            height: 16,
            background: '#1d2430',
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 25,
            top: 24,
            width: 12,
            height: 3,
            background: '#1d2430',
            borderRadius: 2,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 830,
          top: 122,
          width: 204,
          height: 114,
          border: '2px solid #2f456a',
          background: '#173253',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 934,
          top: 40,
          width: 136,
          height: 78,
          border: '2px solid #7f377f',
          background: '#2a1730',
          color: '#ff7dff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
          fontWeight: 900,
        }}
      >
        RELAX
      </div>
      <div
        style={{
          position: 'absolute',
          left: 936,
          top: 82,
          width: 132,
          height: 6,
          background: '#ff7dff55',
          boxShadow: '0 0 12px #ff7dff',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 702,
          top: 210,
          width: 238,
          height: 70,
          borderRadius: 12,
          border: '2px solid #493323',
          background: '#30201a',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 684,
          top: 238,
          width: 20,
          height: 50,
          border: '2px solid #2f4569',
          background: '#6fa7ff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 686,
          top: 228,
          width: 16,
          height: 10,
          border: '2px solid #2f4569',
          background: '#97c0ff',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1004,
          top: 146,
          width: 44,
          height: 120,
          border: '2px solid #2d3f5e',
          background: '#2a3650',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={`book-${i}`}
            style={{
              position: 'absolute',
              left: 4 + (i % 2) * 18,
              top: 8 + Math.floor(i / 2) * 26,
              width: 10,
              height: 18,
              background: i % 2 ? '#6ed3ff' : '#ffd26f',
            }}
          />
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={`plant-${i}`}
          style={{
            position: 'absolute',
            left: i === 0 ? 314 : i === 1 ? 812 : 1034,
            top: i === 0 ? 292 : i === 1 ? 274 : 276,
            width: 14,
            height: 26,
            borderRadius: 2,
            background: '#5f3a20',
            boxShadow: 'inset 0 2px 0 #8a5a31',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -6,
              top: -14,
              width: 26,
              height: 16,
              borderRadius: '50%',
              background: '#2ca268',
            }}
          />
        </div>
      ))}

      {ROOM_LAYOUT.map((room) => (
        <WorkRoom
          key={room.role}
          x={room.x}
          y={room.y}
          w={room.w}
          h={room.h}
          label={room.label}
          color={ROOM_BAR[room.role]}
          active={map[room.role]?.status === 'working'}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: 286,
          top: 638,
          width: 220,
          height: 130,
          border: '2px solid #3b5173',
          background: '#0f1d33',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            color: '#c8dcff',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          오피스 맵
        </div>
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 36,
            width: 198,
            height: 82,
            border: '2px solid #2c3f5f',
            background: '#071225',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 514,
          top: 648,
          width: 214,
          height: 114,
          border: '2px solid #47362b',
          background: '#2f231a',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 20,
            top: 22,
            width: 172,
            height: 62,
            borderRadius: 8,
            border: '2px solid #6f5844',
            background: '#f6e8d2',
            color: '#2f251c',
            fontSize: 22,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          전체 진행 상황을
          <br />
          분석하고 있어요..
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 744,
          top: 638,
          width: 322,
          height: 130,
          border: '2px solid #3b5173',
          background: '#0f1d33',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 14,
            top: 10,
            color: '#c8dcff',
            fontSize: 22,
            fontWeight: 800,
          }}
        >
          실시간 이벤트
        </div>
        {[
          'Backend | API 구현 시작',
          'Frontend | 컴포넌트 개발 시작',
          'QA | 테스트 시나리오 작성',
        ].map((line, i) => (
          <div
            key={line}
            style={{
              position: 'absolute',
              left: 18,
              top: 42 + i * 26,
              color: i === 0 ? '#58a0ff' : i === 1 ? '#2cd79f' : '#f0b429',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            • {line}
          </div>
        ))}
      </div>

      {agents.map((a) => {
        const p = charPosition(a.role, a.isTalking);
        return (
          <PixelChar
            key={a.role}
            role={a.role}
            status={a.status}
            x={p.x}
            y={p.y}
            frame={frame}
            isTalking={a.isTalking}
          />
        );
      })}
    </div>
  );
}
