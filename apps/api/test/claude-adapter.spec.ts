import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { IPty } from 'node-pty';
import { ClaudeAdapter } from '@/agents/adapters/claude.adapter';

type ExitHandler = (e: { exitCode: number; signal?: number }) => void;
type DataHandler = (chunk: string) => void;

class FakePty {
  private exitHandlers: ExitHandler[] = [];
  private dataHandlers: DataHandler[] = [];
  kill = vi.fn();

  onData(handler: DataHandler) {
    this.dataHandlers.push(handler);
    return { dispose: vi.fn() };
  }

  onExit(handler: ExitHandler) {
    this.exitHandlers.push(handler);
    return { dispose: vi.fn() };
  }

  emitData(chunk: string) {
    this.dataHandlers.forEach((handler) => handler(chunk));
  }

  emitExit(exitCode = 0) {
    this.exitHandlers.forEach((handler) => handler({ exitCode }));
  }
}

const spawnMock = vi.fn();

vi.mock('node-pty', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

describe('ClaudeAdapter', () => {
  const adapter = new ClaudeAdapter();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('PTY output을 누적하고 onPtyData로 전달한다', async () => {
    const fake = new FakePty();
    spawnMock.mockReturnValue(fake as unknown as IPty);

    const received: string[] = [];
    const runPromise = adapter.run('hello', {
      workdir: process.cwd(),
      agentId: 'backend',
      workspaceId: 'default',
      onPtyData: (chunk) => received.push(chunk),
    });

    fake.emitData('a');
    fake.emitData('b');
    fake.emitExit(0);

    const result = await runPromise;
    expect(result.stdout).toBe('ab');
    expect(result.exitCode).toBe(0);
    expect(received).toEqual(['a', 'b']);
  });

  it('timeout 시 SIGTERM 후 2초 뒤 kill fallback 호출', async () => {
    const fake = new FakePty();
    spawnMock.mockReturnValue(fake as unknown as IPty);

    const runPromise = adapter.run('hello', {
      workdir: process.cwd(),
      agentId: 'backend',
      workspaceId: 'default',
      timeoutMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(fake.kill).toHaveBeenCalledWith('SIGTERM');

    await vi.advanceTimersByTimeAsync(2000);
    expect(fake.kill).toHaveBeenCalledWith();

    fake.emitExit(1);
    await runPromise;
  });

  it('isAvailable: claude --version 종료코드 0이면 true', async () => {
    const fake = new FakePty();
    spawnMock.mockReturnValue(fake as unknown as IPty);

    const promise = adapter.isAvailable();
    fake.emitExit(0);

    await expect(promise).resolves.toBe(true);
    expect(spawnMock).toHaveBeenCalledWith(
      'claude',
      ['--version'],
      expect.objectContaining({ name: 'xterm-color' }),
    );
  });
});
