import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('user_id', 'uuid', (col) => 
      col.notNull().references('users.id').onDelete('cascade')
    )
    .addColumn('refresh_token_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('user_agent', 'text')
    .addColumn('ip_address', 'varchar(45)')
    .addColumn('expires_at', 'timestamp', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('last_used_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_sessions_user')
    .on('sessions')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_sessions_refresh_token')
    .on('sessions')
    .column('refresh_token_hash')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('sessions').execute();
} 