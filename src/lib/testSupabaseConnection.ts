/**
 * Test script for Supabase connection
 * 
 * This file can be used during development to verify Supabase configuration.
 * Run this after adding your actual Supabase credentials to .env file.
 * 
 * Usage: Import and call testSupabaseConnection() from your app during development
 */

import { supabase, testConnection } from './supabase';

export async function testSupabaseConnection(): Promise<void> {
  console.log('=== Supabase Connection Test ===');
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Anon Key configured:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No');
  
  // Test basic connection
  const isConnected = await testConnection();
  
  if (isConnected) {
    console.log('✓ Successfully connected to Supabase');
    
    // Try a simple query to list tables (requires database to be set up)
    try {
      const { data, error } = await supabase
        .from('churches')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('⚠ Database query test:', error.message);
        console.log('  (This is expected if tables haven\'t been created yet)');
      } else {
        console.log('✓ Database query successful - tables are accessible');
      }
    } catch (err) {
      console.log('⚠ Database not yet configured:', err);
    }
  } else {
    console.error('✗ Failed to connect to Supabase');
    console.error('  Please check:');
    console.error('  1. VITE_SUPABASE_URL is set correctly in .env');
    console.error('  2. VITE_SUPABASE_ANON_KEY is set correctly in .env');
    console.error('  3. Your Supabase project is active');
  }
  
  console.log('=== End Connection Test ===');
}
