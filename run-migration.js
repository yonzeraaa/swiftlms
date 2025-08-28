const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

// Create Supabase client with service role key (we'll need to get this)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// For now, let's try with anon key and see if it works
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250828170442_remove_tests_and_questions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    console.log('Migration content:', migrationSQL);
    
    // Split the SQL into individual commands
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const command of sqlCommands) {
      if (command.trim()) {
        console.log(`Executing: ${command}`);
        const { data, error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          console.error('Error executing command:', error);
        } else {
          console.log('Command executed successfully');
        }
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration();