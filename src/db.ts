import { Pool } from 'pg';
import { config } from './config';
import { logger } from './logger';

export const pool = new Pool({ connectionString: config.postgresUrl });

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected PG error');
});

export async function withClient<T>(fn: (client: Pool) => Promise<T>): Promise<T> {
  return fn(pool);
}
