import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1748000000000 implements MigrationInterface {
  name = 'CreateEventsTable1748000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "agent_id"     VARCHAR(50)  NOT NULL,
        "type"         VARCHAR(20)  NOT NULL,
        "tool"         VARCHAR(100),
        "payload"      JSONB        NOT NULL DEFAULT '{}',
        "timestamp"    TIMESTAMPTZ  NOT NULL,
        "workspace_id" VARCHAR(50)  NOT NULL DEFAULT 'default',
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_events_workspace_created"
      ON "events" ("workspace_id", "created_at" ASC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_events_agent_created"
      ON "events" ("agent_id", "created_at" ASC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
  }
}
