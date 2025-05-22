import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import { defineConfig } from 'kysely-ctl';
import config from './src/config';

export default defineConfig({
  // Database connection configuration
  dialect: new PostgresDialect({
    pool: new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      ssl: config.postgres.ssl,
    })
  }),
  // Migration configuration
  migrations: {
    migrationFolder: './src/db/migrations',
  },

  // Seed configuration (optional)
  seeds: {
    seedFolder: './src/db/seeds',
  },
}) 