import { Pool } from 'pg';
import { Kysely, PostgresDialect, CamelCasePlugin } from 'kysely';
import { Database } from './types';
import config from '../config';

const dialect = new PostgresDialect({
  pool: new Pool({
    host: config.postgres.host,
    port: config.postgres.port,
    database: config.postgres.database,
    user: config.postgres.user,
    password: config.postgres.password,
    ssl: config.postgres.ssl,
    max: config.postgres.maxConnections,
    idleTimeoutMillis: config.postgres.idleTimeoutMillis,
  })
});

export const db = new Kysely<Database>({
  dialect,
  plugins: [new CamelCasePlugin()]
}); 