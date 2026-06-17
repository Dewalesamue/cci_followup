/**
 * Script to apply database migration programmatically
 * 
 * This script reads the SQL migration file and executes it against your Supabase database.
 * 
 * Usage:
 *   npx tsx scripts/apply-migration.ts
 * 
 * Prerequisites:
 *   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env
 *   - You need database admin privileges (service_role key recommended)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your .env file');
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('📋 Reading migration file...');
  
  const migrationPath = path.join(__dirname, '../supabase/migrations/20250101000000_create_initial_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Error: Migration file not found at', migrationPath);
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
  
  console.log('🚀 Applying migration to Supabase...');
  console.log('   URL:', SUPABASE_URL);
  console.log('');
  
  try {
    // Split the SQL file into individual statements
    // Note: This is a simple split and may not handle all edge cases
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
      
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview} `);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Some errors are expected (e.g., "already exists" for idempotent migrations)
        if (error.message.includes('already exists')) {
          console.log('⚠️  (already exists)');
        } else {
          console.log('❌');
          console.error('   Error:', error.message);
          errorCount++;
        }
      } else {
        console.log('✓');
        successCount++;
      }
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('✅ Migration completed!');
    console.log(`   Success: ${successCount} statements`);
    if (errorCount > 0) {
      console.log(`   Errors:  ${errorCount} statements`);
    }
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify tables in Supabase Dashboard → Table Editor');
    console.log('2. Test RLS policies are working correctly');
    console.log('3. Proceed to implement authentication service');
    
  } catch (error) {
    console.error('❌ Fatal error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
