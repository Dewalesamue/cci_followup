# Supabase Setup Guide

This guide walks you through setting up your Supabase project for the Celebration Church International Follow Up application.

## ✅ Completed Steps

The following have already been configured:

1. ✅ Installed `@supabase/supabase-js` package (v2.108.2)
2. ✅ Created `.env` file with placeholder environment variables
3. ✅ Created `src/lib/supabase.ts` with Supabase client configuration
4. ✅ Added TypeScript type definitions for environment variables
5. ✅ Added development connection test utilities

## 🔧 Manual Steps Required

### Step 1: Create a Supabase Project

You have two options to create a Supabase project:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click **"New Project"**
4. Fill in the project details:
   - **Project Name**: `celebration-church` (or your preferred name)
   - **Database Password**: Choose a strong password and save it securely
   - **Region**: Select the region closest to your users
   - **Pricing Plan**: Start with the Free tier
5. Click **"Create new project"**
6. Wait for the project to finish provisioning (2-3 minutes)

#### Option B: Via Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Create a new project
supabase projects create celebration-church --region us-east-1
```

### Step 2: Get Your Project Credentials

1. Once your project is ready, navigate to **Project Settings** (gear icon in the sidebar)
2. Go to **API** section
3. Copy the following values:
   - **Project URL** (looks like `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon/public key** (looks like `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 3: Update Your .env File

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual credentials:

```env
# Replace these with your actual Supabase credentials
VITE_SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**⚠️ Important:** Never commit your `.env` file to version control! It's already listed in `.gitignore`.

### Step 4: Test Your Connection

Once you've added your credentials:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser console (F12 or Cmd+Option+J on Mac)

3. Look for the Supabase connection test output:
   ```
   === Supabase Connection Test ===
   Supabase URL: https://xxxxxxxxxxxxx.supabase.co
   Anon Key configured: Yes
   ✓ Successfully connected to Supabase
   === End Connection Test ===
   ```

4. If you see any errors, verify:
   - ✅ Your `.env` file has the correct values
   - ✅ You've restarted the dev server after updating `.env`
   - ✅ Your Supabase project is active and not paused

### Step 5: Set Up Database Tables

✅ **Migration files have been created!**

The database schema has been defined in `supabase/migrations/20250101000000_create_initial_schema.sql`.

To apply the migration and create all tables:

1. **Option A - Via Supabase Dashboard (Quick & Easy)**:
   - Open [Supabase Dashboard](https://supabase.com) → Your Project
   - Go to **SQL Editor** in the sidebar
   - Click **"New query"**
   - Copy the contents of `supabase/migrations/20250101000000_create_initial_schema.sql`
   - Paste and click **"Run"**
   - Verify tables in **Table Editor**

2. **Option B - Via Supabase CLI (Recommended)**:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link your project
   supabase link --project-ref YOUR_PROJECT_REF
   
   # Apply migration
   supabase db push
   ```

3. **Option C - Via Script** (if you have service_role key):
   ```bash
   npx tsx scripts/apply-migration.ts
   ```

**📚 For detailed migration instructions**, see `supabase/README.md`.

After applying the migration, refresh your app and the connection test should show:
```
✓ Successfully queried churches table (3 rows)
```

The migration automatically seeds three churches:
- **futamap** - Celebration Church International (FUTAMAP)
- **rccg** - RCCG
- **winners** - Winners Chapel

## 🧪 Manual Connection Test

You can also manually test the connection from the browser console:

1. Open your app in the browser
2. Open the console (F12)
3. Type:
   ```javascript
   // Import and test connection
   import { testSupabaseConnection } from './src/lib/testSupabaseConnection';
   await testSupabaseConnection();
   ```

## 📚 What Was Configured

### Files Created/Modified:

1. **`src/lib/supabase.ts`**
   - Exports configured Supabase client instance
   - Includes `setChurchContext()` for RLS multi-tenancy
   - Includes `testConnection()` for development testing

2. **`src/lib/testSupabaseConnection.ts`**
   - Development utility for testing connection
   - Automatically runs when app starts in dev mode

3. **`src/vite-env.d.ts`**
   - TypeScript type definitions for Vite environment variables

4. **`.env`**
   - Environment variables file (with placeholders)

5. **`.env.example`**
   - Updated with Supabase variable documentation

6. **`src/main.tsx`**
   - Added automatic connection test in development mode

## 🔐 Security Notes

- The **anon key** is safe to use in client-side code
- Row Level Security (RLS) policies will protect your data
- Never expose your **service_role** key in client code
- The `.env` file is in `.gitignore` to prevent accidental commits

## 📖 Next Steps

After completing this setup:

1. ✅ Verify connection test passes
2. ⏭️ Proceed to Task 1.2: Create database tables and RLS policies
3. ⏭️ Implement authentication service with Supabase Auth

## 🆘 Troubleshooting

### Connection test fails with "Missing Supabase environment variables"

- **Solution**: Check that your `.env` file exists and has both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set
- Restart the dev server after updating `.env`

### Connection test fails with network error

- **Solution**: Verify your Supabase project is not paused (free tier projects pause after inactivity)
- Check your internet connection
- Verify the project URL is correct

### TypeScript errors about `import.meta.env`

- **Solution**: This should be resolved by `src/vite-env.d.ts`, but if you see errors:
  - Check that `src/vite-env.d.ts` exists
  - Run `npm run lint` to verify TypeScript compilation
  - Restart your IDE/editor

## 📞 Support

For Supabase-specific issues:
- Documentation: [https://supabase.com/docs](https://supabase.com/docs)
- Discord: [https://discord.supabase.com](https://discord.supabase.com)

For application-specific issues:
- Check the design document: `.kiro/specs/streamlined-member-portal-with-qr-checkin/design.md`
- Review requirements: `.kiro/specs/streamlined-member-portal-with-qr-checkin/requirements.md`
