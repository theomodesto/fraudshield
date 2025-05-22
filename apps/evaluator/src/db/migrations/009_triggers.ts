import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create the update_timestamp function
  await sql`
    CREATE OR REPLACE FUNCTION update_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now(); 
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `.execute(db);

  // Create triggers for each table that needs automatic timestamp updates
  const tables = ['merchants', 'users', 'rules', 'transactions'];
  
  for (const table of tables) {
    // First drop the trigger if it exists
    await sql.raw(`
      DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table};
    `).execute(db);

    // Then create the trigger
    await sql.raw(`
      CREATE TRIGGER update_${table}_timestamp 
      BEFORE UPDATE ON ${table}
      FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
    `).execute(db);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop triggers
  const tables = ['merchants', 'users', 'rules', 'transactions'];
  
  for (const table of tables) {
    await sql.raw(`
      DROP TRIGGER IF EXISTS update_${table}_timestamp ON ${table};
    `).execute(db);
  }

  // Drop the function
  await sql`
    DROP FUNCTION IF EXISTS update_timestamp();
  `.execute(db);
} 