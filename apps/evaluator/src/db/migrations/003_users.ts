import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
    .addColumn('merchant_id', 'uuid', (col) => 
      col.notNull().references('merchants.id').onDelete('cascade')
    )
    .addColumn('email', 'varchar(255)', (col) => col.notNull())
    .addColumn('password_hash', 'varchar(255)', (col) => col.notNull())
    .addColumn('first_name', 'varchar(100)')
    .addColumn('last_name', 'varchar(100)')
    .addColumn('role', 'varchar(50)', (col) => col.notNull().defaultTo('user'))
    .addColumn('active', 'boolean', (col) => col.notNull().defaultTo(true))
    .addColumn('created_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('last_login_at', 'timestamp')
    .execute();

  // Create indexes
  await db.schema
    .createIndex('idx_users_email')
    .on('users')
    .column('email')
    .execute();

  await db.schema
    .createIndex('idx_users_merchant')
    .on('users')
    .column('merchant_id')
    .execute();

  // Add unique constraint
  await db.schema
    .alterTable('users')
    .addUniqueConstraint('users_merchant_email_unique', ['merchant_id', 'email'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('users').execute();
} 