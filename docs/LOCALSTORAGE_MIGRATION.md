# LocalStorage to Supabase Migration Guide

This guide explains how to migrate existing member data from localStorage to Supabase.

## Overview

The migration script handles:
1. Reading existing localStorage member data
2. Creating Supabase Auth users for each member
3. Inserting member records in the `members` table linked to `auth.users`

## Prerequisites

- Supabase project set up and running
- Database migrations applied (churches and members tables created)
- Access to the browser console where the application is running

## Migration Steps

### Step 1: Backup Your Data

Before running any migration, **always backup your localStorage data**:

```javascript
// Run in browser console
const backup = backupLocalStorageData();
// Copy the output and save it somewhere safe
```

### Step 2: Run the Migration

1. Open your application in the browser
2. Open the browser's Developer Console (F12)
3. Copy the contents of `scripts/migrate-localstorage-to-supabase.ts`
4. Paste it into the console
5. Run the migration:

```javascript
// Replace with your actual values
await migrateLocalStorageToSupabase(
  'futamap',  // Church ID: 'futamap', 'rccg', or 'winners'
  'https://your-project.supabase.co',  // Your Supabase URL
  'your-anon-key'  // Your Supabase anon key
);
```

### Step 3: Review Results

The migration will output:
- Total members found
- Successfully migrated members
- Failed migrations with error details

Example output:
```
Found 25 members to migrate
Migrating member: John Doe (john@example.com)
✓ Successfully migrated: John Doe
...

=== Migration Summary ===
Total members: 25
Successfully migrated: 23
Failed: 2

Errors:
  - Member abc123: Auth creation failed: Email already registered
```

### Step 4: Verify Migration

After migration, verify in Supabase dashboard:

1. Check `auth.users` table - should see new user accounts
2. Check `members` table - should see member records with `user_id` populated
3. Test login with a migrated member account

## Default Passwords

The migration script generates default passwords for members:
- Format: `Member{last4digits}!`
- Example: For phone `08012345678`, password is `Member5678!`

**Important:** Members should be instructed to reset their passwords on first login.

## Handling Migration Errors

### Common Errors

1. **Email already registered**
   - Member was already migrated or email exists in Supabase
   - Action: Skip or update manually

2. **Invalid email format**
   - Member has no email in localStorage
   - Script generates temporary email: `{phone}@temp.church.local`
   - Action: Update email later in member profile

3. **Database constraint violation**
   - Duplicate phone number or email for same church
   - Action: Clean up duplicates in localStorage first

### Restore from Backup

If migration fails and you need to restore:

```javascript
// Paste your backup string here
const backupData = `{"futamap_members": "...", ...}`;
restoreLocalStorageData(backupData);
```

## Post-Migration Tasks

1. **Update member emails**
   - Members with temporary emails should update them in their profile

2. **Password resets**
   - Inform members to reset their passwords on first login

3. **Verify data integrity**
   - Cross-check a few member records between localStorage and Supabase

4. **Update application code**
   - Switch from localStorage-based auth to Supabase auth
   - Update member service to use Supabase client

## Church-Specific Migration

To migrate members for different churches:

```javascript
// For RCCG
await migrateLocalStorageToSupabase('rccg', supabaseUrl, supabaseKey);

// For Winners Chapel
await migrateLocalStorageToSupabase('winners', supabaseUrl, supabaseKey);

// For Celebration Church (FUTAMAP)
await migrateLocalStorageToSupabase('futamap', supabaseUrl, supabaseKey);
```

## Alternative: Node.js Migration

If you prefer to run the migration from Node.js instead of the browser:

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Export localStorage data to a JSON file
3. Modify the script to read from the JSON file instead of localStorage
4. Run with: `npx tsx scripts/migrate-localstorage-to-supabase.ts`

## Troubleshooting

### Migration is slow
- Supabase has rate limits on auth signups
- Consider batching or adding delays between requests

### Some members missing
- Check localStorage key name (default: `futamap_members`)
- Verify JSON format is correct

### Auth emails not verified
- Supabase sends verification emails by default
- Disable email verification in Supabase dashboard if needed for migration

## Support

If you encounter issues:
1. Check browser console for detailed error messages
2. Verify Supabase project is accessible
3. Review Supabase dashboard logs
4. Contact your system administrator

## Security Notes

- **Never commit Supabase keys to version control**
- Use environment variables for keys in production
- Rotate anon keys after migration if exposed
- Consider using service role key for bulk migrations (with caution)
