import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('api_keys')
    .addColumn('id', 'uuid', (col: any) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('merchant_id', 'uuid', (col) => 
      col.notNull().references('merchants.id').onDelete('cascade')
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('key_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('last_used_at', 'timestamp')
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('expires_at', 'timestamp')
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_api_keys_merchant')
    .on('api_keys')
    .column('merchant_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('api_keys').execute();
} 