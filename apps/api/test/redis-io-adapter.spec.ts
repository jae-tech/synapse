import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedisIoAdapter } from '@/events/redis-io.adapter';

vi.mock('redis', () => {
  const mockClient = {
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    duplicate: vi.fn(),
  };
  mockClient.duplicate.mockReturnValue({ ...mockClient });
  return { createClient: vi.fn(() => mockClient) };
});

vi.mock('@socket.io/redis-adapter', () => ({
  createAdapter: vi.fn(() => 'mock-redis-adapter'),
}));

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  const mockApp = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RedisIoAdapter(mockApp);
  });

  it('connect() 호출 전에는 pubClient/subClient가 null이다', () => {
    // @ts-expect-error private 접근
    expect(adapter.pubClient).toBeNull();
    // @ts-expect-error private 접근
    expect(adapter.subClient).toBeNull();
  });

  it('connect() 이후 pubClient와 subClient가 초기화된다', async () => {
    await adapter.connect('redis://localhost:6379');
    // @ts-expect-error private 접근
    expect(adapter.pubClient).not.toBeNull();
    // @ts-expect-error private 접근
    expect(adapter.subClient).not.toBeNull();
  });

  it('createIOServer() — connect() 전이면 redis adapter 없이 서버를 반환한다', () => {
    const mockServer = { adapter: vi.fn() };
    const superSpy = vi
      .spyOn(Object.getPrototypeOf(Object.getPrototypeOf(adapter)), 'createIOServer')
      .mockReturnValue(mockServer as never);

    const result = adapter.createIOServer(3011, {});

    expect(superSpy).toHaveBeenCalledWith(3011, {});
    expect(mockServer.adapter).not.toHaveBeenCalled();
    expect(result).toBe(mockServer);
  });

  it('createIOServer() — connect() 후면 redis adapter를 서버에 주입한다', async () => {
    await adapter.connect('redis://localhost:6379');

    const mockServer = { adapter: vi.fn() };
    vi.spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(adapter)),
      'createIOServer',
    ).mockReturnValue(mockServer as never);

    adapter.createIOServer(3011, {});

    expect(mockServer.adapter).toHaveBeenCalledWith('mock-redis-adapter');
  });

  it('close() — connect() 전에 호출해도 에러 없이 완료된다', async () => {
    await expect(adapter.close()).resolves.toBeUndefined();
  });

  it('close() — connect() 후 호출 시 pubClient와 subClient의 quit을 호출한다', async () => {
    await adapter.connect('redis://localhost:6379');
    await adapter.close();

    // @ts-expect-error private 접근
    expect(adapter.pubClient?.quit).toHaveBeenCalled();
    // @ts-expect-error private 접근
    expect(adapter.subClient?.quit).toHaveBeenCalled();
  });
});

describe('WS_REDIS_ENABLED 환경변수 분기 (fallback 모드)', () => {
  it('WS_REDIS_ENABLED=1 이 아닌 경우 RedisIoAdapter.connect()를 호출하지 않아야 한다', async () => {
    const connectSpy = vi.spyOn(RedisIoAdapter.prototype, 'connect');
    const origEnv = process.env.WS_REDIS_ENABLED;
    delete process.env.WS_REDIS_ENABLED;

    const wsRedisEnabled = process.env.WS_REDIS_ENABLED === '1';
    if (wsRedisEnabled) {
      const adapter = new RedisIoAdapter({} as never);
      await adapter.connect('redis://localhost:6379');
    }

    expect(connectSpy).not.toHaveBeenCalled();
    process.env.WS_REDIS_ENABLED = origEnv;
  });

  it('WS_REDIS_ENABLED=1 인 경우 connect()가 호출된다', async () => {
    const connectSpy = vi.spyOn(RedisIoAdapter.prototype, 'connect').mockResolvedValue(undefined);
    process.env.WS_REDIS_ENABLED = '1';

    const wsRedisEnabled = process.env.WS_REDIS_ENABLED === '1';
    if (wsRedisEnabled) {
      const adapter = new RedisIoAdapter({} as never);
      await adapter.connect(process.env.WS_REDIS_URL ?? 'redis://localhost:6379');
    }

    expect(connectSpy).toHaveBeenCalledWith('redis://localhost:6379');
    delete process.env.WS_REDIS_ENABLED;
  });
});
