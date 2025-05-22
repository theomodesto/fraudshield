import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the update_timestamp function if it doesn't exist
  await sql`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `.execute(db);

  await db.schema
    .createTable('merchants')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('api_key', 'varchar(64)', (col) => col.notNull().unique())
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('settings', 'jsonb', (col) => 
      col.notNull().defaultTo(sql`'{"riskThreshold": 70, "enableCaptcha": true, "captchaThreshold": 80, "ipAnonymization": false}'::jsonb`)
    )
    .addColumn('integration_data', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
    .execute();

  // Create index
  await db.schema
    .createIndex('idx_merchants_api_key')
    .on('merchants')
    .column('api_key')
    .execute();

  // Create trigger
  await sql`
    CREATE TRIGGER update_merchants_timestamp 
    BEFORE UPDATE ON merchants 
    FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TRIGGER IF EXISTS update_merchants_timestamp ON merchants;
  `.execute(db);

  await db.schema
    .dropTable('merchants')
    .execute();
    
  // Don't drop the function as it might be used by other tables
} 