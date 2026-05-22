import { Injectable } from '@nestjs/common';
import * as pty from 'node-pty';
import { AgentAdapter, AgentResult, AgentRunOptions } from './agent-adapter.interface';

@Injectable()
export class ClaudeAdapter implements AgentAdapter {
  readonly name = 'claude';

  async run(prompt: string, options: AgentRunOptions): Promise<AgentResult> {
    const startMs = Date.now();

    return new Promise<AgentResult>((resolve, reject) => {
      let stdout = '';
      let child: pty.IPty | undefined;

      try {
        child = pty.spawn('claude', ['--dangerously-skip-permissions', '-p', prompt], {
          name: 'xterm-color',
          cwd: options.workdir,
          env: {
            ...process.env,
            AGENT_ID: options.agentId,
            SYNAPSE_API_URL: process.env.SYNAPSE_API_URL ?? 'http://localhost:3011',
            ...options.env,
          },
        });
      } catch (err) {
        reject(err);
        return;
      }

      child.onData((chunk) => {
        stdout += chunk;
        options.onPtyData?.(chunk);
      });

      // spawn timeout 옵션은 신뢰하지 않고 프로세스 레벨 타이머로 종료한다.
      const timeoutMs = options.timeoutMs ?? 300_000;
      const timer = setTimeout(() => {
        try {
          child.kill('SIGTERM');
        } catch {
          // no-op
        }

        setTimeout(() => {
          try {
            child.kill();
          } catch {
            // no-op
          }
        }, 2000);
      }, timeoutMs);

      child.onExit(({ exitCode }) => {
        clearTimeout(timer);
        resolve({
          stdout,
          exitCode: exitCode ?? 1,
          durationMs: Date.now() - startMs,
        });
      });
    });
  }

  async isAvailable(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let child: pty.IPty | undefined;
      try {
        child = pty.spawn('claude', ['--version'], {
          name: 'xterm-color',
          cwd: process.cwd(),
          env: process.env as Record<string, string>,
        });
      } catch {
        resolve(false);
        return;
      }

      child.onExit(({ exitCode }) => {
        resolve(exitCode === 0);
      });
    });
  }
}
