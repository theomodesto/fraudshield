import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the transactions table without partitioning
  await db.schema
    .createTable('transactions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('merchant_id', 'uuid', (col) => col.notNull().references('merchants.id'))
    .addColumn('order_id', 'varchar(255)')
    .addColumn('session_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('evaluation_id', 'uuid', (col) => col.notNull())
    .addColumn('fingerprint_visitor_id', 'varchar(255)')
    .addColumn('risk_score', 'integer', (col) => col.notNull())
    .addColumn('is_fraud', 'boolean', (col) => col.notNull())
    .addColumn('risk_factors', 'jsonb')
    .addColumn('page_data', 'jsonb')
    .addColumn('user_action', 'varchar(50)')
    .addColumn('geo_data', 'jsonb')
    .addColumn('decision', 'varchar(50)')
    .addColumn('review_status', 'varchar(50)', (col) => col.defaultTo('pending'))
    .addColumn('reviewed_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`))
    .addColumn('reviewed_by', 'uuid', (col) => col.references('users.id'))
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`))
    .addColumn('updated_at', 'timestamp', (col) => col.defaultTo(sql`NOW()`))
    .addUniqueConstraint('unique_merchant_order', ['merchant_id', 'order_id'])
    .execute();

  // Create a trigger for updating the timestamp
  await sql`
    CREATE TRIGGER update_transactions_timestamp 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `.execute(db);

  // Create indexes
  await db.schema
    .createIndex('idx_transactions_merchant_date')
    .on('transactions')
    .columns(['merchant_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('idx_transactions_fingerprint')
    .on('transactions')
    .column('fingerprint_visitor_id')
    .execute();

  await db.schema
    .createIndex('idx_transactions_order_id')
    .on('transactions')
    .column('order_id')
    .execute();

  await db.schema
    .createIndex('idx_transactions_session_id')
    .on('transactions')
    .column('session_id')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop the trigger first
  await sql`
    DROP TRIGGER IF EXISTS update_transactions_timestamp ON transactions;
  `.execute(db);

  // Then drop the table
  await db.schema.dropTable('transactions').execute();
} 