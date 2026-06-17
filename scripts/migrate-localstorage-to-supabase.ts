/**
 * LocalStorage to Supabase Migration Script
 * 
 * This script migrates existing member data from localStorage to Supabase.
 * It handles:
 * 1. Reading localStorage member data
 * 2. Creating Supabase Auth users for each member
 * 3. Linking members table records to auth.users via user_id
 * 
 * Usage:
 * 1. Open browser console on your application
 * 2. Copy and paste this script
 * 3. Run: await migrateLocalStorageToSupabase('YOUR_CHURCH_ID')
 * 
 * Note: This is a one-time migration script. Run carefully and backup data first.
 */

interface LocalStorageMember {
  id: string;
  churchId?: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  gender: 'Male' | 'Female';
  department: string;
  level: string;
  faculty: string;
  residence: string;
  birthday: string;
  dateJoined: string;
  status: 'Active' | 'Inactive';
  mapName: string;
  passwordHash?: string;
  profilePicture?: string;
}

interface MigrationResult {
  success: boolean;
  totalMembers: number;
  migratedMembers: number;
  failedMembers: number;
  errors: Array<{ memberId: string; error: string }>;
}

/**
 * Main migration function
 * @param churchId - The church ID to migrate members to (e.g., 'futamap', 'rccg', 'winners')
 * @param supabaseUrl - Your Supabase project URL
 * @param supabaseAnonKey - Your Supabase anon/public key
 */
async function migrateLocalStorageToSupabase(
  churchId: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    totalMembers: 0,
    migratedMembers: 0,
    failedMembers: 0,
    errors: []
  };

  try {
    // Step 1: Read localStorage members
    const storageKey = 'futamap_members'; // Adjust if using different key
    const membersStr = localStorage.getItem(storageKey);
    
    if (!membersStr) {
      console.warn('No members found in localStorage');
      return result;
    }

    const members: LocalStorageMember[] = JSON.parse(membersStr);
    result.totalMembers = members.length;

    console.log(`Found ${members.length} members to migrate`);

    // Step 2: Initialize Supabase client (browser-based)
    // Note: In a real scenario, you'd import from your app's supabase config
    const { createClient } = (window as any).supabase;
    if (!createClient) {
      throw new Error('Supabase client not available. Make sure @supabase/supabase-js is loaded');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Step 3: Migrate each member
    for (const member of members) {
      try {
        // Generate a default email if not present (required for Supabase Auth)
        const email = member.email || `${member.phoneNumber}@temp.church.local`;
        
        // Generate a default password (members should reset on first login)
        const defaultPassword = `Member${member.phoneNumber.slice(-4)}!`;

        console.log(`Migrating member: ${member.fullName} (${email})`);

        // Step 3a: Create Supabase Auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email,
          password: defaultPassword,
          options: {
            data: {
              full_name: member.fullName,
              phone_number: member.phoneNumber
            }
          }
        });

        if (authError) {
          console.error(`Failed to create auth user for ${member.fullName}:`, authError);
          result.failedMembers++;
          result.errors.push({
            memberId: member.id,
            error: `Auth creation failed: ${authError.message}`
          });
          continue;
        }

        const userId = authData.user?.id;
        if (!userId) {
          console.error(`No user ID returned for ${member.fullName}`);
          result.failedMembers++;
          result.errors.push({
            memberId: member.id,
            error: 'No user ID returned from auth signup'
          });
          continue;
        }

        // Step 3b: Insert member record linked to auth user
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            church_id: churchId,
            user_id: userId,
            full_name: member.fullName,
            phone_number: member.phoneNumber,
            email: email === `${member.phoneNumber}@temp.church.local` ? null : email,
            gender: member.gender,
            department: member.department,
            level: member.level,
            faculty: member.faculty,
            residence: member.residence,
            birthday: member.birthday,
            date_joined: member.dateJoined,
            status: member.status,
            map_name: member.mapName,
            profile_picture: member.profilePicture
          });

        if (memberError) {
          console.error(`Failed to insert member record for ${member.fullName}:`, memberError);
          result.failedMembers++;
          result.errors.push({
            memberId: member.id,
            error: `Member insertion failed: ${memberError.message}`
          });
          continue;
        }

        console.log(`✓ Successfully migrated: ${member.fullName}`);
        result.migratedMembers++;

      } catch (error: any) {
        console.error(`Error migrating member ${member.fullName}:`, error);
        result.failedMembers++;
        result.errors.push({
          memberId: member.id,
          error: error.message || 'Unknown error'
        });
      }
    }

    result.success = result.migratedMembers > 0;

    // Print summary
    console.log('\n=== Migration Summary ===');
    console.log(`Total members: ${result.totalMembers}`);
    console.log(`Successfully migrated: ${result.migratedMembers}`);
    console.log(`Failed: ${result.failedMembers}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(err => {
        console.log(`  - Member ${err.memberId}: ${err.error}`);
      });
    }

    return result;

  } catch (error: any) {
    console.error('Migration failed:', error);
    result.errors.push({
      memberId: 'N/A',
      error: error.message || 'Unknown error'
    });
    return result;
  }
}

/**
 * Helper function to backup localStorage data before migration
 */
function backupLocalStorageData(): string {
  const backup: Record<string, string | null> = {};
  const keys = [
    'futamap_members',
    'futamap_attendance',
    'futamap_prayer_requests',
    'futamap_visitors',
    'futamap_followups',
    'futamap_activities'
  ];

  keys.forEach(key => {
    backup[key] = localStorage.getItem(key);
  });

  const backupStr = JSON.stringify(backup, null, 2);
  console.log('Backup created. Save this data:');
  console.log(backupStr);
  
  return backupStr;
}

/**
 * Helper function to restore localStorage data from backup
 */
function restoreLocalStorageData(backupStr: string): void {
  try {
    const backup = JSON.parse(backupStr);
    Object.keys(backup).forEach(key => {
      if (backup[key]) {
        localStorage.setItem(key, backup[key]);
      }
    });
    console.log('Backup restored successfully');
  } catch (error) {
    console.error('Failed to restore backup:', error);
  }
}

// Export for use in Node.js or module environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    migrateLocalStorageToSupabase,
    backupLocalStorageData,
    restoreLocalStorageData
  };
}

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).migrateLocalStorageToSupabase = migrateLocalStorageToSupabase;
  (window as any).backupLocalStorageData = backupLocalStorageData;
  (window as any).restoreLocalStorageData = restoreLocalStorageData;
}
