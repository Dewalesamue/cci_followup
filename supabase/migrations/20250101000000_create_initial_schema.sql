-- Create churches table
CREATE TABLE churches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  map_name TEXT NOT NULL,
  logo_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  department TEXT,
  level TEXT,
  faculty TEXT,
  residence TEXT,
  birthday DATE,
  date_joined DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  map_name TEXT,
  profile_picture TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, phone_number),
  UNIQUE(church_id, email)
);

-- Create attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('Sunday Service', 'Midweek Service', 'MAP Meeting', 'Special Program')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, date, service_type)
);

-- Create indexes for attendance
CREATE INDEX idx_attendance_member ON attendance(member_id, church_id);
CREATE INDEX idx_attendance_date ON attendance(date DESC);

-- Create prayer_requests table
CREATE TABLE prayer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  request TEXT NOT NULL CHECK (char_length(request) BETWEEN 10 AND 500),
  status TEXT DEFAULT 'Praying' CHECK (status IN ('Praying', 'Answered', 'Ongoing')),
  date_submitted DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for prayer_requests
CREATE INDEX idx_prayer_requests_member ON prayer_requests(member_id, church_id);

-- Create church_events table
CREATE TABLE church_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT REFERENCES churches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  category TEXT CHECK (category IN ('program', 'meeting', 'special')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for church_events
CREATE INDEX idx_events_date ON church_events(date ASC);

-- Create follow_ups table
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  follow_up_type TEXT NOT NULL,
  notes TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for members table
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create RLS function for church context
CREATE OR REPLACE FUNCTION set_church_context(church_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.church_id', church_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on all tables
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for churches table
CREATE POLICY "Churches are viewable by everyone" ON churches
  FOR SELECT
  USING (true);

-- RLS Policies for members table
CREATE POLICY "Members access own church" ON members
  FOR SELECT
  USING (church_id = current_setting('app.church_id'::text, true)::text);

CREATE POLICY "Members can update own profile" ON members
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can insert members" ON members
  FOR INSERT
  WITH CHECK (true);

-- RLS Policies for attendance table
CREATE POLICY "Attendance church isolation" ON attendance
  FOR SELECT
  USING (church_id = current_setting('app.church_id'::text, true)::text);

CREATE POLICY "Members can check-in" ON attendance
  FOR INSERT
  WITH CHECK (
    church_id = current_setting('app.church_id'::text, true)::text
    AND member_id IN (
      SELECT id FROM members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for prayer_requests table
CREATE POLICY "Prayer requests church isolation" ON prayer_requests
  FOR SELECT
  USING (church_id = current_setting('app.church_id'::text, true)::text);

CREATE POLICY "Members can submit prayers" ON prayer_requests
  FOR INSERT
  WITH CHECK (
    church_id = current_setting('app.church_id'::text, true)::text
  );

-- RLS Policies for church_events table
CREATE POLICY "Events church isolation" ON church_events
  FOR SELECT
  USING (
    church_id = current_setting('app.church_id'::text, true)::text
    OR church_id IS NULL
  );

-- RLS Policies for follow_ups table
CREATE POLICY "Follow-ups church isolation" ON follow_ups
  FOR SELECT
  USING (church_id = current_setting('app.church_id'::text, true)::text);

-- Insert initial church data
INSERT INTO churches (id, name, map_name, logo_name) 
VALUES 
  ('futamap', 'Celebration Church International', 'FUTAMAP', 'futamap_logo.png'),
  ('rccg', 'RCCG', 'RCCG', 'rccg_logo.png'),
  ('winners', 'Winners Chapel', 'WINNERS', 'winners_logo.png')
ON CONFLICT (id) DO NOTHING;
