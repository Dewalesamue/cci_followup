# Scripts Directory

This directory contains utility scripts for database operations and migrations.

## Available Scripts

### 1. `apply-migration.ts`
Applies SQL migration files to the Supabase database.

**Usage:**
```bash
npx tsx scripts/apply-migration.ts
```

### 2. `migrate-localstorage-to-supabase.ts`
Migrates existing member data from browser localStorage to Supabase.

**Usage:**
- **Browser Console**: Copy script contents and run in browser console
- **Node.js**: Can be adapted for Node.js execution with JSON file input

See [LOCALSTORAGE_MIGRATION.md](../docs/LOCALSTORAGE_MIGRATION.md) for detailed instructions.

**Example (Browser Console):**
```javascript
await migrateLocalStorageToSupabase(
  'futamap',
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

## Seed Data

Initial church data is automatically seeded when running the database migration:
- **futamap** - Celebration Church International (FUTAMAP)
- **rccg** - RCCG
- **winners** - Winners Chapel

The seed data is included in `supabase/migrations/20250101000000_create_initial_schema.sql`.

## Development Workflow

1. **Create Migration**: Add new `.sql` file to `supabase/migrations/`
2. **Apply Migration**: Run `apply-migration.ts` to execute the migration
3. **Verify**: Check Supabase dashboard to confirm changes
4. **Seed Data**: If needed, add seed data to migration files or create separate seed scripts

## Notes

- Always backup data before running migrations
- Test migrations on a development database first
- Use `ON CONFLICT DO NOTHING` for idempotent inserts
- Keep migrations version-controlled and sequential
