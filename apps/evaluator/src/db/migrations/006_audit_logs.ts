import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('audit_logs')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('merchant_id', 'uuid', (col) => 
      col.notNull().references('merchants.id').onDelete('cascade')
    )
    .addColumn('user_id', 'uuid', (col) => 
      col.references('users.id')
    )
    .addColumn('action', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_type', 'varchar(50)', (col) => col.notNull())
    .addColumn('entity_id', 'uuid')
    .addColumn('details', 'jsonb')
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('ip_address', 'varchar(45)')
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_audit_logs_merchant')
    .on('audit_logs')
    .column('merchant_id')
    .execute();

  await db.schema
    .createIndex('idx_audit_logs_created_at')
    .on('audit_logs')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('audit_logs').execute();
} 