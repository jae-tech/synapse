import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('events')
@Index(['workspaceId', 'createdAt'])
@Index(['agentId', 'createdAt'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'varchar', length: 50 })
  agentId: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tool: string | null;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ name: 'workspace_id', type: 'varchar', length: 50, default: 'default' })
  workspaceId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
