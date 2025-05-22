import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create schema
  await db.schema
    .createSchema('fraudshield')
    .ifNotExists()
    .execute();

  // Enable UUID extension
  await sql`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .dropSchema('fraudshield')
    .execute();
} 