import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that required environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TypeScript Interfaces - Database Schema
// ============================================================================

/**
 * Church table schema
 */
export interface SupabaseChurch {
  id: string;
  name: string;
  map_name: string;
  logo_name: string | null;
  created_at: string;
}

/**
 * Member table schema
 */
export interface SupabaseMember {
  id: string; // UUID
  church_id: string;
  user_id: string | null; // UUID from auth.users
  full_name: string;
  phone_number: string;
  email: string | null;
  gender: 'Male' | 'Female' | null;
  department: string | null;
  level: string | null;
  faculty: string | null;
  residence: string | null;
  birthday: string | null; // DATE format
  date_joined: string; // DATE format
  status: 'Active' | 'Inactive';
  map_name: string | null;
  profile_picture: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Attendance table schema
 */
export interface SupabaseAttendance {
  id: string; // UUID
  church_id: string;
  member_id: string; // UUID
  date: string; // DATE format
  service_type: 'Sunday Service' | 'Midweek Service' | 'MAP Meeting' | 'Special Program';
  created_at: string;
}

/**
 * Prayer request table schema
 */
export interface SupabasePrayerRequest {
  id: string; // UUID
  church_id: string;
  member_id: string | null; // UUID
  phone_number: string;
  full_name: string;
  request: string;
  status: 'Praying' | 'Answered' | 'Ongoing';
  date_submitted: string; // DATE format
  created_at: string;
}

/**
 * Church event table schema
 */
export interface SupabaseChurchEvent {
  id: string; // UUID
  church_id: string | null;
  title: string;
  date: string; // DATE format
  time: string;
  location: string | null;
  category: 'program' | 'meeting' | 'special' | null;
  created_at: string;
}

/**
 * Follow-up table schema
 */
export interface SupabaseFollowUp {
  id: string; // UUID
  church_id: string;
  member_id: string | null; // UUID
  follow_up_type: string;
  notes: string | null;
  assigned_to: string | null;
  status: string;
  created_at: string;
}

/**
 * Member session data returned by getMemberSession()
 */
export interface MemberSessionData {
  userId: string; // Supabase Auth user ID
  memberId: string; // Member record ID
  fullName: string;
  churchId: string;
  phoneNumber: string;
  email: string | null;
  accessToken: string; // JWT token
  refreshToken: string;
  authenticatedAt: string; // ISO 8601 timestamp
}

/**
 * Set church context for Row Level Security (RLS) policies
 * This function must be called after authentication to ensure
 * proper multi-tenant data isolation
 * 
 * @param churchId - The church tenant identifier
 */
export async function setChurchContext(churchId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('set_church_context', {
      church_id: churchId,
    });
    
    if (error) {
      console.error('Failed to set church context:', error);
      throw error;
    }
  } catch (err) {
    console.error('Error setting church context:', err);
    throw err;
  }
}

/**
 * Get current member session with profile data
 * Retrieves Supabase Auth session and fetches associated member profile
 * 
 * @returns Promise<MemberSessionData | null> - Member session data or null if not authenticated
 */
export async function getMemberSession(): Promise<MemberSessionData | null> {
  try {
    // Get current Supabase Auth session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No active member session');
      return null;
    }
    
    // Get member profile using user_id from auth session
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    if (memberError || !member) {
      console.error('Failed to retrieve member profile:', memberError);
      return null;
    }
    
    // Set church context for RLS
    await setChurchContext(member.church_id);
    
    // Build and return member session data
    return {
      userId: session.user.id,
      memberId: member.id,
      fullName: member.full_name,
      churchId: member.church_id,
      phoneNumber: member.phone_number,
      email: member.email,
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      authenticatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error retrieving member session:', err);
    return null;
  }
}

/**
 * Test the Supabase connection by attempting to query the database
 * This is useful for verifying configuration during development
 * 
 * @returns Promise<boolean> - Returns true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    // Simple query to test connection - queries the auth schema
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✓ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection error:', err);
    return false;
  }
}
