# Database Schema Documentation

This document provides comprehensive documentation for the Celebration Church International Follow Up application database schema.

## Overview

The database follows a multi-tenant architecture with strict tenant isolation through Row Level Security (RLS) policies. All data operations are filtered by `church_id` to ensure churches can only access their own data.

## Entity Relationship Diagram

```
┌─────────────┐
│  churches   │
│─────────────│
│ id (PK)     │──┐
│ name        │  │
│ map_name    │  │
│ logo_name   │  │
│ created_at  │  │
└─────────────┘  │
                 │
        ┌────────┴────────────────────────┐
        │                                 │
        │                                 │
┌───────▼──────┐                  ┌───────▼──────────┐
│   members    │                  │  church_events   │
│──────────────│                  │──────────────────│
│ id (PK)      │──┐               │ id (PK)          │
│ church_id(FK)│  │               │ church_id (FK)   │
│ user_id (FK) │  │               │ title            │
│ full_name    │  │               │ date             │
│ phone_number │  │               │ time             │
│ email        │  │               │ location         │
│ ...          │  │               │ category         │
└──────────────┘  │               └──────────────────┘
                  │
         ┌────────┴─────────────┐
         │                      │
         │                      │
┌────────▼──────┐      ┌────────▼─────────────┐
│  attendance   │      │  prayer_requests     │
│───────────────│      │──────────────────────│
│ id (PK)       │      │ id (PK)              │
│ church_id(FK) │      │ church_id (FK)       │
│ member_id(FK) │      │ member_id (FK)       │
│ date          │      │ phone_number         │
│ service_type  │      │ full_name            │
│ created_at    │      │ request              │
└───────────────┘      │ status               │
                       │ date_submitted       │
                       └──────────────────────┘

         ┌─────────────────┐
         │   follow_ups    │
         │─────────────────│
         │ id (PK)         │
         │ church_id (FK)  │
         │ member_id (FK)  │
         │ follow_up_type  │
         │ notes           │
         │ assigned_to     │
         │ status          │
         └─────────────────┘
```

## Tables

### 1. churches

Stores information about each church tenant in the multi-tenant system.

| Column     | Type         | Constraints | Description                    |
|------------|--------------|-------------|--------------------------------|
| id         | TEXT         | PRIMARY KEY | Unique church identifier       |
| name       | TEXT         | NOT NULL    | Full church name               |
| map_name   | TEXT         | NOT NULL    | MAP chapter name               |
| logo_name  | TEXT         | NULL        | Logo filename                  |
| created_at | TIMESTAMPTZ  | DEFAULT NOW | Record creation timestamp      |

**RLS Policy**: Viewable by everyone (public access)

**Initial Seed Data**:
The migration automatically seeds three churches:

```sql
INSERT INTO churches (id, name, map_name, logo_name) 
VALUES 
  ('futamap', 'Celebration Church International', 'FUTAMAP', 'futamap_logo.png'),
  ('rccg', 'RCCG', 'RCCG', 'rccg_logo.png'),
  ('winners', 'Winners Chapel', 'WINNERS', 'winners_logo.png');
```

---

### 2. members

Stores member profile information with links to Supabase Auth users.

| Column           | Type         | Constraints                    | Description                        |
|------------------|--------------|--------------------------------|------------------------------------|
| id               | UUID         | PRIMARY KEY, DEFAULT uuid      | Unique member identifier           |
| church_id        | TEXT         | FK → churches, NOT NULL        | Church tenant ID                   |
| user_id          | UUID         | FK → auth.users                | Supabase Auth user ID              |
| full_name        | TEXT         | NOT NULL                       | Member's full name                 |
| phone_number     | TEXT         | NOT NULL                       | Phone number                       |
| email            | TEXT         | NULL                           | Email address (optional)           |
| gender           | TEXT         | CHECK ('Male', 'Female')       | Gender                             |
| department       | TEXT         | NULL                           | Academic department                |
| level            | TEXT         | NULL                           | Academic level                     |
| faculty          | TEXT         | NULL                           | Academic faculty                   |
| residence        | TEXT         | NULL                           | Residential address                |
| birthday         | DATE         | NULL                           | Date of birth                      |
| date_joined      | DATE         | DEFAULT CURRENT_DATE           | Member join date                   |
| status           | TEXT         | DEFAULT 'Active'               | Member status (Active/Inactive)    |
| map_name         | TEXT         | NULL                           | MAP name/nickname                  |
| profile_picture  | TEXT         | NULL                           | Profile picture URL                |
| created_at       | TIMESTAMPTZ  | DEFAULT NOW                    | Record creation timestamp          |
| updated_at       | TIMESTAMPTZ  | DEFAULT NOW                    | Last update timestamp              |

**Constraints**:
- UNIQUE (church_id, phone_number) - Phone must be unique within church
- UNIQUE (church_id, email) - Email must be unique within church
- CHECK status IN ('Active', 'Inactive')
- CHECK gender IN ('Male', 'Female')

**RLS Policies**:
- SELECT: Members can only view their own church's data
- UPDATE: Members can only update their own profile (matched by user_id)
- INSERT: Open for self-registration

**Trigger**: `update_members_updated_at` - Automatically updates `updated_at` on row modification

**Editable Fields** (by members):
- phone_number
- email
- residence
- profile_picture

**Read-Only Fields** (admin only):
- full_name, department, level, faculty, date_joined, birthday, map_name

---

### 3. attendance

Stores attendance records for church services and events.

| Column        | Type         | Constraints                           | Description                    |
|---------------|--------------|---------------------------------------|--------------------------------|
| id            | UUID         | PRIMARY KEY, DEFAULT uuid             | Unique attendance record ID    |
| church_id     | TEXT         | FK → churches, NOT NULL               | Church tenant ID               |
| member_id     | UUID         | FK → members, NOT NULL                | Member who checked in          |
| date          | DATE         | NOT NULL                              | Service date                   |
| service_type  | TEXT         | NOT NULL, CHECK (4 types)             | Type of service                |
| created_at    | TIMESTAMPTZ  | DEFAULT NOW                           | Check-in timestamp             |

**Constraints**:
- UNIQUE (member_id, date, service_type) - Prevents duplicate check-ins
- CHECK service_type IN ('Sunday Service', 'Midweek Service', 'MAP Meeting', 'Special Program')

**Indexes**:
- `idx_attendance_member` ON (member_id, church_id) - Fast member lookup
- `idx_attendance_date` ON (date DESC) - Fast date-based queries

**RLS Policies**:
- SELECT: Church isolation via church_id
- INSERT: Members can only check themselves in (validated via auth.uid())

**Business Rules**:
- A member can only check in once per service type per day
- Check-in creates a permanent record (no deletion via UI)

---

### 4. prayer_requests

Stores prayer requests submitted by members.

| Column         | Type         | Constraints                     | Description                    |
|----------------|--------------|-------------------------------- |--------------------------------|
| id             | UUID         | PRIMARY KEY, DEFAULT uuid       | Unique prayer request ID       |
| church_id      | TEXT         | FK → churches, NOT NULL         | Church tenant ID               |
| member_id      | UUID         | FK → members                    | Submitting member (nullable)   |
| phone_number   | TEXT         | NOT NULL                        | Contact phone                  |
| full_name      | TEXT         | NOT NULL                        | Requester name                 |
| request        | TEXT         | NOT NULL, CHECK (10-500 chars)  | Prayer request text            |
| status         | TEXT         | DEFAULT 'Praying'               | Request status                 |
| date_submitted | DATE         | DEFAULT CURRENT_DATE            | Submission date                |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW                     | Record creation timestamp      |

**Constraints**:
- CHECK char_length(request) BETWEEN 10 AND 500
- CHECK status IN ('Praying', 'Answered', 'Ongoing')

**Indexes**:
- `idx_prayer_requests_member` ON (member_id, church_id) - Fast member lookup

**RLS Policies**:
- SELECT: Church isolation via church_id
- INSERT: Members can submit prayers for their church

**Business Rules**:
- Prayer text must be 10-500 characters
- Requests can be submitted by non-members (member_id nullable)
- Status managed by church administrators

---

### 5. church_events

Stores upcoming church events, programs, and meetings.

| Column     | Type         | Constraints              | Description                    |
|------------|--------------|--------------------------|--------------------------------|
| id         | UUID         | PRIMARY KEY, DEFAULT uuid| Unique event ID                |
| church_id  | TEXT         | FK → churches            | Church tenant ID (nullable)    |
| title      | TEXT         | NOT NULL                 | Event title                    |
| date       | DATE         | NOT NULL                 | Event date                     |
| time       | TEXT         | NOT NULL                 | Event time (HH:MM format)      |
| location   | TEXT         | NULL                     | Event location                 |
| category   | TEXT         | CHECK (3 types)          | Event category                 |
| created_at | TIMESTAMPTZ  | DEFAULT NOW              | Record creation timestamp      |

**Constraints**:
- CHECK category IN ('program', 'meeting', 'special')

**Indexes**:
- `idx_events_date` ON (date ASC) - Fast chronological queries

**RLS Policies**:
- SELECT: Members see their church's events OR global events (church_id IS NULL)

**Business Rules**:
- Events with NULL church_id are visible to all churches (global events)
- Members see only future events in the UI

---

### 6. follow_ups

Stores follow-up tasks for members requiring attention.

| Column         | Type         | Constraints              | Description                    |
|----------------|--------------|--------------------------|--------------------------------|
| id             | UUID         | PRIMARY KEY, DEFAULT uuid| Unique follow-up ID            |
| church_id      | TEXT         | FK → churches, NOT NULL  | Church tenant ID               |
| member_id      | UUID         | FK → members             | Member requiring follow-up     |
| follow_up_type | TEXT         | NOT NULL                 | Type of follow-up needed       |
| notes          | TEXT         | NULL                     | Additional notes               |
| assigned_to    | TEXT         | NULL                     | Person assigned to follow-up   |
| status         | TEXT         | DEFAULT 'Pending'        | Follow-up status               |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW              | Record creation timestamp      |

**RLS Policies**:
- SELECT: Church isolation via church_id

**Business Rules**:
- Used by administrators to track member engagement
- Not directly visible to members in the member portal

---

## Functions

### update_updated_at_column()

Automatically updates the `updated_at` timestamp when a row is modified.

**Usage**: Applied via trigger on `members` table

**Definition**:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### set_church_context(church_id)

Sets the church context for Row Level Security policy evaluation.

**Parameters**:
- `church_id` (TEXT): The church identifier to set

**Usage**:
```typescript
await supabase.rpc('set_church_context', { church_id: 'futamap' });
```

**Definition**:
```sql
CREATE OR REPLACE FUNCTION set_church_context(church_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.church_id', church_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Security**: SECURITY DEFINER allows function to set configuration that affects RLS policies

---

## Row Level Security (RLS)

All tables have RLS enabled to enforce multi-tenant data isolation.

### RLS Policy Summary

| Table            | SELECT Policy                          | INSERT Policy                    | UPDATE Policy                  |
|------------------|----------------------------------------|----------------------------------|--------------------------------|
| churches         | Public (no restriction)                | N/A                              | N/A                            |
| members          | church_id matches context              | Open (for self-registration)     | user_id matches auth.uid()     |
| attendance       | church_id matches context              | member_id matches auth user      | N/A                            |
| prayer_requests  | church_id matches context              | church_id matches context        | N/A                            |
| church_events    | church_id matches or NULL              | N/A                              | N/A                            |
| follow_ups       | church_id matches context              | N/A                              | N/A                            |

### How RLS Works

1. **Church Context Setup**: On login, call `set_church_context(churchId)` to set the tenant
2. **Automatic Filtering**: All queries automatically filter by `current_setting('app.church_id')`
3. **Auth Integration**: Supabase Auth `auth.uid()` verifies user identity
4. **Data Isolation**: Members can only access their church's data

**Example**:
```typescript
// Set church context after login
await supabase.rpc('set_church_context', { church_id: member.churchId });

// All subsequent queries are automatically filtered
const { data: members } = await supabase
  .from('members')
  .select('*');
// Returns only members from the current church
```

---

## Data Types and Enums

### Service Types (attendance.service_type)
- `'Sunday Service'` - Weekly Sunday worship
- `'Midweek Service'` - Midweek Bible study
- `'MAP Meeting'` - MAP-specific gatherings
- `'Special Program'` - Special events

### Member Status (members.status)
- `'Active'` - Current active member
- `'Inactive'` - Alumni or inactive member

### Prayer Request Status (prayer_requests.status)
- `'Praying'` - New/ongoing prayer request
- `'Answered'` - Prayer has been answered
- `'Ongoing'` - Continues to need prayer

### Event Categories (church_events.category)
- `'program'` - Church program
- `'meeting'` - Church meeting
- `'special'` - Special event

### Gender (members.gender)
- `'Male'`
- `'Female'`

---

## Indexes

| Index Name                   | Table            | Columns                | Purpose                        |
|------------------------------|------------------|------------------------|--------------------------------|
| idx_attendance_member        | attendance       | member_id, church_id   | Fast member attendance lookup  |
| idx_attendance_date          | attendance       | date DESC              | Date-based queries             |
| idx_prayer_requests_member   | prayer_requests  | member_id, church_id   | Fast member prayer lookup      |
| idx_events_date              | church_events    | date ASC               | Chronological event sorting    |

---

## Constraints Summary

### Unique Constraints
- members: (church_id, phone_number)
- members: (church_id, email)
- attendance: (member_id, date, service_type)

### Check Constraints
- members.status IN ('Active', 'Inactive')
- members.gender IN ('Male', 'Female')
- attendance.service_type IN (4 service types)
- prayer_requests.request length 10-500
- prayer_requests.status IN (3 statuses)
- church_events.category IN (3 categories)

### Foreign Keys
All foreign keys include CASCADE or SET NULL delete rules:
- CASCADE: Delete child records when parent is deleted
- SET NULL: Set foreign key to NULL when parent is deleted

---

## Migration Instructions

See `supabase/README.md` for detailed migration instructions.

**Quick Start**:
```sql
-- Via Supabase SQL Editor
-- Copy and run: supabase/migrations/20250101000000_create_initial_schema.sql
```

---

## Security Considerations

1. **Multi-Tenancy**: Strict isolation via RLS ensures churches cannot access each other's data
2. **Authentication**: Integration with Supabase Auth for secure user management
3. **Service Role**: Never expose service_role key in client code - use anon key
4. **Password Security**: Passwords hashed by Supabase Auth (bcrypt)
5. **Member Self-Service**: Members can only edit specific fields (phone, email, residence, profile_picture)

---

## Common Queries

### Get Member Attendance History
```sql
SELECT a.date, a.service_type, a.created_at
FROM attendance a
WHERE a.member_id = 'member-uuid'
  AND a.church_id = 'futamap'
ORDER BY a.date DESC;
```

### Check for Duplicate Check-In
```sql
SELECT id FROM attendance
WHERE member_id = 'member-uuid'
  AND date = '2026-06-15'
  AND service_type = 'Sunday Service';
```

### Get Upcoming Events
```sql
SELECT * FROM church_events
WHERE (church_id = 'futamap' OR church_id IS NULL)
  AND date >= CURRENT_DATE
ORDER BY date ASC
LIMIT 5;
```

### Get Member Prayer Requests
```sql
SELECT * FROM prayer_requests
WHERE member_id = 'member-uuid'
  AND church_id = 'futamap'
ORDER BY date_submitted DESC;
```

---

## Maintenance

### Backup Recommendations
- Daily automated backups via Supabase
- Pre-migration manual backup
- Test restore procedures quarterly

### Performance Monitoring
- Monitor query performance via Supabase Dashboard
- Review slow queries monthly
- Add indexes as needed based on query patterns

### Data Retention
- Attendance records: Retain indefinitely
- Prayer requests: Archive answered/resolved after 1 year
- Events: Archive past events after 1 year
- Follow-ups: Archive completed after 90 days

---

## References

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
