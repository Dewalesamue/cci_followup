# Supabase Database Migrations

This directory contains SQL migration files for the Celebration Church International Follow Up application database schema.

## Directory Structure

```
supabase/
├── migrations/
│   └── 20250101000000_create_initial_schema.sql
└── README.md
```

## How to Apply Migrations

You have two options to apply these migrations to your Supabase database:

### Option 1: Using Supabase Dashboard (Recommended for Quick Setup)

1. Log in to your Supabase project at [https://supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** in the left sidebar
3. Click **"New query"**
4. Copy the entire contents of `migrations/20250101000000_create_initial_schema.sql`
5. Paste it into the SQL editor
6. Click **"Run"** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)
7. Verify the tables were created by going to **Table Editor** in the left sidebar

### Option 2: Using Supabase CLI (Recommended for Production)

#### Prerequisites

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   
   You can find your project ref in your Supabase project settings URL:
   `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

#### Apply Migrations

Run the following command to apply all pending migrations:

```bash
supabase db push
```

This will execute all migration files in the `supabase/migrations/` directory that haven't been applied yet.

#### Verify Migration

Check the status of your migrations:

```bash
supabase migration list
```

## What This Migration Creates

### Tables

1. **churches** - Stores church/tenant information
   - Primary Key: `id` (TEXT)
   - Columns: name, map_name, logo_name, created_at

2. **members** - Stores member profiles
   - Primary Key: `id` (UUID)
   - Foreign Keys: church_id → churches, user_id → auth.users
   - Unique Constraints: (church_id, phone_number), (church_id, email)
   - Columns: full_name, phone_number, email, gender, department, level, faculty, residence, birthday, date_joined, status, map_name, profile_picture, created_at, updated_at

3. **attendance** - Stores attendance records
   - Primary Key: `id` (UUID)
   - Foreign Keys: church_id → churches, member_id → members
   - Unique Constraint: (member_id, date, service_type) - prevents duplicate check-ins
   - Indexes: idx_attendance_member, idx_attendance_date
   - Columns: date, service_type, created_at

4. **prayer_requests** - Stores prayer submissions
   - Primary Key: `id` (UUID)
   - Foreign Keys: church_id → churches, member_id → members
   - CHECK Constraint: request text must be 10-500 characters
   - Index: idx_prayer_requests_member
   - Columns: phone_number, full_name, request, status, date_submitted, created_at

5. **church_events** - Stores upcoming events
   - Primary Key: `id` (UUID)
   - Foreign Key: church_id → churches
   - Index: idx_events_date
   - Columns: title, date, time, location, category, created_at

6. **follow_ups** - Stores follow-up tasks
   - Primary Key: `id` (UUID)
   - Foreign Keys: church_id → churches, member_id → members
   - Columns: follow_up_type, notes, assigned_to, status, created_at

### Functions

1. **update_updated_at_column()** - Automatically updates the `updated_at` timestamp on members table
2. **set_church_context(church_id)** - Sets the church context for Row Level Security

### Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

- **churches**: Viewable by everyone
- **members**: 
  - View: Only members of same church
  - Update: Members can only update their own profile
  - Insert: Open for self-registration
- **attendance**: 
  - View: Only same church data
  - Insert: Members can only check themselves in
- **prayer_requests**: 
  - View: Only same church data
  - Insert: Members can submit prayers
- **church_events**: 
  - View: Only same church or global events
- **follow_ups**: 
  - View: Only same church data

### Sample Data

The migration includes a sample church record:
- ID: `futamap`
- Name: `FUTA MAP`

This can be removed in production or replaced with your actual church data.

## Troubleshooting

### Error: relation already exists

If you see errors like `relation "churches" already exists`, it means the tables have already been created. You can either:

1. Drop the existing tables (⚠️ **Warning: This will delete all data!**):
   ```sql
   DROP TABLE IF EXISTS follow_ups CASCADE;
   DROP TABLE IF EXISTS church_events CASCADE;
   DROP TABLE IF EXISTS prayer_requests CASCADE;
   DROP TABLE IF EXISTS attendance CASCADE;
   DROP TABLE IF EXISTS members CASCADE;
   DROP TABLE IF EXISTS churches CASCADE;
   ```
   Then re-run the migration.

2. Or modify the migration file to use `CREATE TABLE IF NOT EXISTS` instead of `CREATE TABLE`.

### Error: permission denied

Make sure you're using the database password (not the anon key) when applying migrations through CLI.

### Tables not visible in Table Editor

1. Refresh your Supabase dashboard
2. Check the SQL Editor for any error messages
3. Verify RLS policies are correctly applied

## Next Steps

After applying this migration:

1. ✅ Verify all tables are created in the Table Editor
2. ✅ Test RLS policies by querying tables
3. ⏭️ Proceed to implement the authentication service (Task 1.3)
4. ⏭️ Implement member registration and check-in features

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Multi-tenant isolation is enforced through `church_id` filtering
- Members can only access their own church's data
- Authentication is handled through Supabase Auth (auth.users)

## Additional Resources

- [Supabase Database Documentation](https://supabase.com/docs/guides/database)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
