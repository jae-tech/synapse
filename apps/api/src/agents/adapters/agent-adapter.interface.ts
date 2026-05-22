export interface AgentRunOptions {
  workdir: string;
  agentId: string;
  workspaceId: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  onPtyData?: (chunk: string) => void;
}

export interface AgentResult {
  stdout: string;
  exitCode: number;
  durationMs: number;
}

export interface AgentAdapter {
  readonly name: string;
  run(prompt: string, options: AgentRunOptions): Promise<AgentResult>;
  isAvailable(): Promise<boolean>;
}
