import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;
export const DB_TOKEN = Symbol('DRIZZLE_DB');

export function createDb(url: string): DrizzleDb {
  const client = postgres(url, { max: 10 });
  return drizzle(client, { schema });
}
