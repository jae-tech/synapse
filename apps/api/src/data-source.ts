import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { EventEntity } from './events/event.entity';

const url = process.env.DATABASE_URL ?? 'postgresql://synapse:synapse@localhost:5432/synapse';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: [EventEntity],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
