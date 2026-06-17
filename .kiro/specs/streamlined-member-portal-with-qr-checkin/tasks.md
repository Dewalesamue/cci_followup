# Implementation Plan: Streamlined Member Portal with QR-Based Check-In

## Overview

This implementation plan follows a Supabase-first architecture: Database Setup → Service Layer Migration → Self-Registration → QR Check-In System → Member Dashboard Redesign → Polish. The system uses Supabase Postgres for data storage, Supabase Auth for authentication, and Row Level Security (RLS) policies for multi-tenant isolation.

The implementation migrates from localStorage to Supabase, replacing manual password hashing with Supabase Auth's built-in bcrypt security, and implementing production-ready database schemas with proper indexing and constraints.

## Tasks

- [ ] 1. Set up Supabase project and database schema
  - [x] 1.1 Create Supabase project and configure environment variables
    - Create new Supabase project via Supabase dashboard or CLI
    - Copy project URL and anon key to `.env` file as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
    - Install `@supabase/supabase-js` package: `npm install @supabase/supabase-js`
    - Create `src/lib/supabase.ts` file exporting configured Supabase client instance
    - Test connection by running simple query in development
  
  - [x] 1.2 Create database tables with proper schema
    - Create `churches` table with columns: id (TEXT PK), name, map_name, logo_name, created_at
    - Create `members` table with columns: id (UUID PK), church_id (FK), user_id (FK to auth.users), full_name, phone_number, email, gender, department, level, faculty, residence, birthday, date_joined, status, map_name, profile_picture, created_at, updated_at
    - Add UNIQUE constraints: (church_id, phone_number), (church_id, email)
    - Create `attendance` table with columns: id (UUID PK), church_id (FK), member_id (FK), date, service_type, created_at
    - Add UNIQUE constraint: (member_id, date, service_type) to prevent duplicate check-ins
    - Create indexes: idx_attendance_member ON (member_id, church_id), idx_attendance_date ON (date DESC)
    - Create `prayer_requests` table with columns: id (UUID PK), church_id (FK), member_id (FK), phone_number, full_name, request (TEXT with CHECK length 10-500), status, date_submitted, created_at
    - Create `church_events` table with columns: id (UUID PK), church_id (FK), title, date, time, location, category, created_at
    - Create `follow_ups` table with columns: id (UUID PK), church_id (FK), member_id (FK), follow_up_type, notes, assigned_to, status, created_at
    - _Design Reference: Supabase Database Schema section_
  
  - [x] 1.3 Implement Row Level Security (RLS) policies for multi-tenant isolation
    - Enable RLS on all tables: `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY`
    - Create `set_church_context(church_id TEXT)` function for setting RLS context variable
    - Create RLS policy on `members`: "Members access own church" filtering by current_setting('app.church_id')
    - Create RLS policy on `members`: "Members update own profile" using auth.uid() check
    - Create RLS policy on `attendance`: "Attendance church isolation" filtering by church_id
    - Create RLS policy on `attendance`: "Members check-in only" validating member_id matches auth.uid()
    - Create RLS policy on `prayer_requests`: "Prayer requests church isolation" filtering by church_id
    - Create RLS policy on `church_events`: "Events church isolation" filtering by church_id or NULL
    - Test RLS policies by attempting cross-tenant data access (should fail)
    - _Design Reference: Row Level Security (RLS) Policies section_
  
  - [x] 1.4 Seed initial church data
    - Insert default churches into `churches` table: futamap (Celebration Church International), rccg, winners
    - Optionally migrate existing localStorage members to Supabase (create migration script)
    - Create Supabase Auth users for existing members (if migrating)
    - Link members table records to auth.users via user_id foreign key

- [ ] 2. Migrate service layer to Supabase
  - [x] 2.1 Create Supabase client wrapper and utility functions
    - Create `src/lib/supabase.ts` with `createClient()` initialization
    - Export `supabase` client instance for use across services
    - Create `setChurchContext(churchId: string)` helper calling Supabase RPC function
    - Create `getMemberSession()` helper retrieving Supabase Auth session and member profile
    - Create TypeScript interfaces matching Supabase table schemas
    - _Design Reference: Supabase Client Configuration section_
  
  - [ ] 2.2 Migrate authService to use Supabase Auth
    - Replace `hashPassword()` function with Supabase Auth calls (remove manual hashing)
    - Implement `memberSignUp(email, password, memberData)` using `supabase.auth.signUp()`
    - After Auth signup, insert member record into `members` table with user_id
    - Implement `memberSignIn(email, password)` using `supabase.auth.signInWithPassword()`
    - After signin, fetch member profile and call `setChurchContext(member.churchId)`
    - Implement `getMemberSession()` using `supabase.auth.getSession()`
    - Implement `memberSignOut()` using `supabase.auth.signOut()`
    - Implement `resetPasswordForEmail(email)` using `supabase.auth.resetPasswordForEmail()`
    - Implement `updatePassword(newPassword)` using `supabase.auth.updateUser({ password })`
    - Remove all localStorage session management code (Supabase handles this)
    - _Design Reference: AuthService Extensions section, Requirements: 31, 32_
  
  - [ ] 2.3 Migrate memberService to use Supabase queries
    - Replace `initializeMembers()` localStorage logic with Supabase SELECT queries
    - Implement `getMembers()` using `supabase.from('members').select('*').eq('church_id', churchId)`
    - Implement `getMemberById(id)` using `.select('*').eq('id', id).single()`
    - Implement `getMemberByUserId(userId)` using `.select('*').eq('user_id', userId).single()`
    - Implement `addMember()` using `supabase.from('members').insert().select().single()`
    - Implement `updateMember()` using `supabase.from('members').update().eq('id', id).select().single()`
    - Implement `checkPhoneUnique()` querying members table for duplicate phone
    - Implement `checkEmailUnique()` querying members table for duplicate email
    - Implement `updateMemberProfile()` with field validation (only allow editable fields)
    - Remove all localStorage member data management code
    - _Design Reference: MemberService Extensions section, Requirements: 4, 31_
  
  - [ ] 2.4 Migrate attendanceService to use Supabase queries
    - Replace localStorage attendance logic with Supabase SELECT queries
    - Implement `getAttendance()` using `supabase.from('attendance').select('*')`
    - Implement `getAttendanceHistoryForMember(memberId)` with `.eq('member_id', memberId).order('date', { ascending: false })`
    - Implement `checkInMember()` with duplicate check using UNIQUE constraint handling
    - On insert, catch unique constraint violation and SELECT existing record
    - Implement `addAttendance()` using `supabase.from('attendance').insert().select().single()`
    - Implement `calculateAttendanceStats()` fetching records and calculating client-side
    - Implement `filterAttendanceByServiceType()` and `filterAttendanceByDateRange()`
    - Remove all localStorage attendance data management code
    - _Design Reference: AttendanceService Extensions section, Requirements: 1, 5, 6, 27, 28_
  
  - [ ] 2.5 Migrate prayerService to use Supabase queries
    - Replace localStorage prayer logic with Supabase SELECT queries
    - Implement `getPrayerRequests()` using `supabase.from('prayer_requests').select('*')`
    - Implement `getMemberPrayerRequests(memberId, churchId)` with `.eq('member_id', memberId).order('date_submitted', { ascending: false })`
    - Implement `submitMemberPrayerRequest()` with character validation (10-500 chars)
    - Use `supabase.from('prayer_requests').insert()` with CHECK constraint validation
    - Implement `updatePrayerRequestStatus()` using `.update({ status }).eq('id', id)`
    - Remove all localStorage prayer data management code
    - _Design Reference: PrayerService Extensions section, Requirements: 7, 8, 22_

- [ ] 3. Checkpoint - Verify Supabase service layer migration
  - Test all service methods with Supabase backend
  - Verify RLS policies enforce church_id isolation
  - Confirm UNIQUE constraints prevent duplicates
  - Ask user if questions arise

- [ ] 4. Implement member self-registration flow with Supabase Auth
  - [ ] 4.1 Create MemberSelfRegistration component
    - Build registration form collecting: fullName, phoneNumber, email, password, confirmPassword, gender, department, level, faculty, residence, birthday, mapName
    - Use email as primary identifier for Supabase Auth (required)
    - Implement password strength indicator with weak/medium/strong states
    - Add show/hide password toggle for password fields
    - Implement real-time validation feedback
    - Display asterisk indicators for required fields
    - _Requirements: 31.1, 31.2, 31.11, 31.12, 33.7_
  
  - [ ] 4.2 Implement registration form validation and submission
    - Validate password meets minimum 8 characters with at least one number
    - Validate phone number format (accept +234XXXXXXXXXX, 0XXXXXXXXXXX formats)
    - Validate email format using standard regex
    - Call `memberService.checkPhoneUnique()` before submission (Supabase query)
    - Call `memberService.checkEmailUnique()` before submission (Supabase query)
    - Display specific error messages for duplicate phone/email
    - Call `authService.memberSignUp()` on successful validation
    - _Requirements: 31.3, 31.4, 31.5, 31.6, 31.11, 33.8, 33.9_
  
  - [ ] 4.3 Handle registration success and auto-login
    - Supabase Auth automatically creates session on signup
    - Insert member record into Supabase `members` table with user_id from Auth
    - Set church context via `setChurchContext(churchId)`
    - Redirect to member dashboard with welcome message: "Welcome to [Church Name]! Your account has been created and you're now logged in."
    - Display loading state during registration: "Creating Your Account..."
    - Disable submit button while processing
    - _Requirements: 31.7, 31.8, 31.9, 31.10, 31.13, 33.12_
  
  - [ ] 4.4 Add self-registration entry points
    - Add "Create Account" link on MemberLogin page
    - Add "Create Account" call-to-action button on landing page
    - Ensure registration route is publicly accessible without authentication
    - _Requirements: 33.1, 33.2, 33.3_

- [ ] 5. Implement QR-based check-in system with Supabase
  - [ ] 5.1 Create CheckInPage component with QR payload parsing
    - Create new route `/check-in` accessible with or without authentication
    - Parse URL query parameters: churchId, serviceType, date, time from QR code
    - Implement `parseQRPayload()` function extracting parameters from URL
    - Default date to current date if not provided
    - Default time to current time if not provided
    - Validate serviceType against valid enum values
    - _Requirements: 2.1, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 5.2 Implement check-in authentication and session validation
    - Check for Supabase Auth session on check-in page load
    - Redirect to member login if not authenticated, preserving return URL
    - Fetch member profile from Supabase using session.user.id
    - Display member name and profile picture for confirmation
    - Validate memberId matches session user's member record
    - Validate churchId matches member's churchId
    - _Requirements: 2.2, 2.5, 30.1, 30.2, 30.3, 30.5_
  
  - [ ] 5.3 Implement check-in submission with Supabase unique constraint handling
    - Display service details (service type, date, time) for member confirmation
    - Show large "Check In" button (minimum 44px height)
    - Call `attendanceService.checkInMember()` on button click
    - Handle Supabase unique constraint violation for duplicate detection
    - If constraint error, SELECT and return existing attendance record
    - Display loading state: disable button and show "Checking in..." text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 26.1_
  
  - [ ] 5.4 Implement check-in success confirmation with animation
    - Display animated checkmark icon on successful check-in
    - Show success message: "You've been marked present for [Service Type] on [Date]"
    - Use green color scheme for success state
    - Animate success message with fade-in effect
    - Display "Continue to Dashboard" button
    - Auto-redirect to member dashboard after 3 seconds
    - _Requirements: 1.6, 24.1, 24.2, 24.3, 24.4, 24.5_
  
  - [ ] 5.5 Implement check-in error handling
    - Display "Please log in to check in" with login link if session missing
    - Display "Connection failed. Please try again" for network errors
    - Display "Invalid QR code" for invalid QR payload
    - Show "Try Again" button after any error
    - Log error details to browser console
    - _Requirements: 1.7, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 5.6 Implement manual check-in fallback
    - Display service type dropdown when QR parameters missing
    - Populate dropdown with valid service types
    - Display date picker for manual date selection
    - Default service type to "Sunday Service" if current day is Sunday
    - Require service type selection before enabling check-in button
    - _Requirements: 2.4, 15.6, 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 5.7 Optimize check-in page for mobile devices
    - Ensure page renders correctly on 320px-768px viewports
    - Use touch-optimized button sizes (minimum 44px × 44px)
    - Display service details and check-in button above the fold
    - Use large, readable fonts (minimum 14px body, 18px buttons)
    - Display full-screen confirmation for 2 seconds on mobile
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 6. Checkpoint - Test QR check-in flow end-to-end with Supabase
  - Verify attendance records are inserted into Supabase
  - Test duplicate prevention via UNIQUE constraint
  - Confirm RLS policies enforce check-in restrictions
  - Ask user if questions arise

- [ ] 7. Redesign MemberDashboardView with Supabase data fetching
  - [ ] 7.1 Create MemberDashboardView component structure with tab navigation
    - Create tab-based navigation: Overview, Prayers, Profile, Events
    - Implement tab switching without page reload
    - Apply visual styling to active tab
    - Maintain navigation state in sessionStorage
    - Default to "Overview" tab on first login
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 7.2 Create MemberHeader component with Supabase session
    - Fetch member profile from Supabase using session.user.id
    - Display header banner with churchName, mapName, fullName, profilePicture
    - Display memberId using monospace font
    - Include logout button calling `supabase.auth.signOut()`
    - Display profile picture or fallback avatar
    - Persist header across all tab navigation
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.4, 17.5_
  
  - [ ] 7.3 Implement Overview tab with Supabase queries
    - Create ProfileInfoCard displaying member fields (read-only)
    - Fetch member data from Supabase `members` table
    - Display lock icons on read-only fields
    - Display birthday with cake icon, highlight if within 7 days
    - Create AttendanceHistoryCard fetching from `attendance` table
    - Implement filter controls (service type, date range) on Supabase queries
    - Show empty state when no attendance records found
    - Create AttendanceStatsCard calculating metrics from Supabase data
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 6.1, 6.2, 18.1, 18.2, 29.1_

- [ ] 8. Implement Prayers tab with Supabase
  - [ ] 8.1 Create PrayerSubmissionForm component
    - Create textarea input for prayer request text
    - Implement character counter (max 500, min 10)
    - Validate prayer request length before submission
    - Display validation error for short requests
    - _Requirements: 7.1, 7.3, 22.1, 22.2, 22.3, 22.4, 22.5_
  
  - [ ] 8.2 Implement prayer submission to Supabase
    - Call `prayerService.submitMemberPrayerRequest()` inserting into Supabase
    - Link prayer to member's id, phoneNumber, fullName, churchId
    - Set initial status to "Praying"
    - Display loading state: "Submitting..."
    - Show confirmation: "Your prayer request has been submitted"
    - Clear textarea after successful submission
    - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7, 26.2_
  
  - [ ] 8.3 Create PrayerHistoryList component
    - Fetch prayers from Supabase `prayer_requests` table filtered by member_id
    - Display each prayer with dateSubmitted, request text, status
    - Sort by dateSubmitted descending
    - Use color-coded badges for status values
    - Show empty state when no prayers found
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 29.2_

- [ ] 9. Implement Profile tab with Supabase Auth password management
  - [ ] 9.1 Create EditableFields component
    - Create form with editable fields: phoneNumber, email, residence, profilePicture
    - Mark phoneNumber as required
    - Validate email format if provided
    - Display visual distinction between editable and read-only fields
    - Add "Save" button with loading state
    - _Requirements: 4.1, 4.2, 4.3, 17.1, 17.2_
  
  - [ ] 9.2 Implement profile update submission to Supabase
    - Call `memberService.updateMemberProfile()` updating Supabase `members` table
    - Validate only editable fields are updated
    - Display loading state: "Saving..."
    - Show success message: "Profile details saved successfully!"
    - Reload member data from Supabase after save
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 17.3, 26.3_
  
  - [ ] 9.3 Create PasswordManager component using Supabase Auth
    - Create form with fields: current password, new password, confirm new password
    - Implement password strength indicator for new password
    - Add show/hide toggle for all password fields
    - Validate new password meets requirements
    - Validate passwords match
    - _Requirements: 32.4, 32.5_
  
  - [ ] 9.4 Implement password change using Supabase Auth updateUser
    - Call `supabase.auth.updateUser({ password: newPassword })`
    - Supabase automatically verifies current password
    - Display error if current password incorrect
    - Show success message: "Password updated successfully"
    - Display loading state during password change
    - _Requirements: 32.6, 32.11, 33.6_
  
  - [ ] 9.5 Create ReadOnlyFields component
    - Display non-editable fields: memberId, fullName, department, level, faculty, dateJoined, mapName, birthday
    - Show lock icon next to each read-only field
    - Display help text: "Contact church administrator to update"
    - Group read-only fields in separate visual section
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 10. Implement Events tab with Supabase
  - [ ] 10.1 Create EventsList component
    - Fetch events from Supabase `church_events` table filtered by churchId
    - Display for each event: title, date, time, location, category
    - Filter to show only future dates (date >= current date)
    - Sort by date ascending (soonest first)
    - Use category badges with visual indicators
    - Limit preview to 3-5 items
    - Show empty state when no upcoming events
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 29.3_

- [ ] 11. Implement password reset flow using Supabase Auth
  - [ ] 11.1 Create PasswordResetFlow component
    - Create first step: request form with email input
    - Create second step: confirmation message
    - Implement step navigation
    - _Requirements: 33.4_
  
  - [ ] 11.2 Implement password reset request using Supabase Auth
    - Call `supabase.auth.resetPasswordForEmail(email)`
    - Supabase sends magic link to user's email
    - Display error if email not found
    - Progress to confirmation step on success
    - _Requirements: 32.8_
  
  - [ ] 11.3 Handle password reset callback
    - Create route to handle Supabase Auth redirect after email click
    - Display new password entry form
    - Call `supabase.auth.updateUser({ password: newPassword })`
    - Show success message and redirect to login
    - _Requirements: 32.9, 33.5_
  
  - [ ] 11.4 Add forgot password entry point
    - Add "Forgot Password?" link on MemberLogin page
    - Ensure password reset flow is publicly accessible
    - _Requirements: 33.4_

- [ ] 12. Checkpoint - Test complete member portal flows with Supabase
  - Verify all CRUD operations work with Supabase
  - Test RLS policies enforce data isolation
  - Confirm Supabase Auth handles password management
  - Ask user if questions arise

- [ ] 13. Implement session management with Supabase Auth
  - [ ] 13.1 Implement Supabase Auth session handling
    - Use `supabase.auth.getSession()` to retrieve current session
    - Supabase automatically stores session in localStorage
    - Implement session state listener for auth changes
    - Auto-refresh tokens handled by Supabase client
    - _Requirements: 10.3_
  
  - [ ] 13.2 Implement logout functionality
    - Create logout button in header calling `supabase.auth.signOut()`
    - Supabase automatically clears session and tokens
    - Redirect to landing page after logout
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [ ] 13.3 Implement session validation and expiration handling
    - Check for valid session on all authenticated routes
    - Redirect to login if session missing or expired
    - Preserve intended destination URL for post-login redirect
    - Display message: "Your session has expired. Please log in again."
    - _Requirements: 10.5_

- [ ] 14. Implement multi-tenant security with Supabase RLS
  - [ ] 14.1 Verify RLS policy enforcement
    - Test that members can only access their own church's data
    - Verify attendance, prayer, member, event queries filtered by churchId
    - Confirm cross-tenant access attempts are blocked
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_
  
  - [ ] 14.2 Implement check-in security validations
    - Always use session.user.id to lookup member_id (never trust client)
    - Validate member_id matches authenticated user's member record
    - Validate churchId from QR matches member's churchId
    - Reject requests with mismatches
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ] 14.3 Implement profile editing access control
    - Define EDITABLE_FIELDS constant
    - Define READ_ONLY_FIELDS constant
    - Validate profile updates only contain editable fields
    - Reject updates attempting to modify read-only fields
    - RLS policy ensures members can only update own profile
    - _Requirements: 4.1, 4.2_

- [ ] 15. Add mobile responsiveness and polish
  - [ ] 15.1 Implement mobile-responsive tab navigation
    - Convert tab navigation to horizontal scroll on mobile
    - Stack cards vertically on mobile
    - Ensure touch targets are minimum 44px × 44px
    - Use responsive breakpoints
    - _Requirements: 12.1, 12.2_
  
  - [ ] 15.2 Implement responsive typography
    - Set minimum font sizes: 14px body, 18px buttons, 16px inputs
    - Use readable line heights (1.5-1.6)
    - Ensure text readable without zooming
    - _Requirements: 12.4_
  
  - [ ] 15.3 Add loading states for all async operations
    - Implement loading spinners for operations exceeding 500ms
    - Disable action buttons during processing
    - Show descriptive loading text
    - Re-enable buttons when operations complete
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [ ] 15.4 Implement empty states with guidance messages
    - Add empty state for attendance history
    - Add empty state for prayer requests
    - Add empty state for events list
    - Use friendly, encouraging tone
    - Include action buttons
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_
  
  - [ ] 15.5 Add error display components
    - Create Toast component for notifications
    - Implement inline error displays for forms
    - Create full-page error screen for critical failures
    - Use consistent error styling
    - _Requirements: 1.7, 7.5, 13.1, 13.2, 13.3_

- [ ] 16. Final checkpoint - Complete end-to-end testing with Supabase
  - Test all features with Supabase backend
  - Verify RLS policies work correctly
  - Confirm Supabase Auth handles all authentication flows
  - Test on mobile devices
  - Ask user if questions arise

## Notes

- All tasks use Supabase as the backend (no localStorage for production data)
- Supabase Auth handles all password hashing, JWT tokens, and session management
- Row Level Security (RLS) policies enforce multi-tenant isolation at the database level
- UNIQUE constraints prevent duplicate check-ins and registrations
- All queries use Supabase query builder (parameterized, SQL injection-safe)
- Service layer provides abstraction over Supabase operations
- Mobile responsiveness integrated throughout
- No legacy password compatibility needed (Supabase Auth from day one)

## Tasks

- [ ] 1. Extend service layer for member authentication and self-registration
  - [ ] 1.1 Extend authService with password management methods
    - Add `validatePasswordStrength()` method that validates minimum 8 characters and at least one numeric character
    - Add `hashPassword()` method for password hashing (deterministic hash for localStorage demo)
    - Add `memberLogin()` method accepting email/phone and password with legacy fallback support
    - Add `memberSelfRegister()` method that validates uniqueness, hashes password, creates member, and establishes session
    - Add `changeMemberPassword()` method that verifies current password before updating
    - Add `resetMemberPassword()` method for forgot password flow
    - _Requirements: 31.4, 31.5, 32.1, 32.2, 32.3, 32.6_
  
  - [ ] 1.2 Extend memberService with uniqueness validation and profile update methods
    - Add `checkPhoneUnique()` method that validates phone number uniqueness within churchId
    - Add `checkEmailUnique()` method that validates email uniqueness within churchId
    - Add `getMemberByPhoneOrEmail()` method for login identifier lookup
    - Add `updateMemberProfile()` method that validates and updates only editable fields (phone, email, residence, profilePicture)
    - _Requirements: 31.6, 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 1.3 Extend attendanceService with check-in and statistics calculation methods
    - Add `checkInMember()` method that prevents duplicate attendance and validates session
    - Add `calculateAttendanceStats()` method returning total count, participation rate, streak, and category breakdowns
    - Add `filterAttendanceByServiceType()` method for filtered attendance history
    - Add `filterAttendanceByDateRange()` method for date-range filtered attendance
    - Implement streak calculation logic with consecutive service tracking and absence detection
    - _Requirements: 1.4, 1.5, 6.1, 6.2, 6.3, 27.1, 27.2, 28.1, 28.2_
  
  - [ ] 1.4 Extend prayerService with member-specific prayer request methods
    - Add `getMemberPrayerRequests()` method filtering by phone/fullName and churchId
    - Add `submitMemberPrayerRequest()` method with character validation (min 10, max 500)
    - _Requirements: 7.2, 7.3, 8.1, 22.1, 22.4_

- [ ] 2. Checkpoint - Verify service layer extensions
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implement member self-registration flow
  - [ ] 3.1 Create MemberSelfRegistration component
    - Build registration form collecting all required fields: fullName, phoneNumber, email, password, confirmPassword, gender, department, level, faculty, residence, birthday, mapName
    - Implement password strength indicator with weak/medium/strong states based on length and complexity
    - Add show/hide password toggle for password fields
    - Implement real-time validation feedback for all form fields
    - Add character counter for password field
    - Display asterisk indicators for required fields
    - _Requirements: 31.3, 31.4, 31.10, 31.11, 33.7_
  
  - [ ] 3.2 Implement registration form validation and submission
    - Validate password meets minimum 8 characters with at least one number
    - Validate phone number format (accept +234XXXXXXXXXX, 0XXXXXXXXXXX formats)
    - Validate email format using standard regex if provided
    - Check phone uniqueness via `memberService.checkPhoneUnique()` before submission
    - Check email uniqueness via `memberService.checkEmailUnique()` before submission
    - Display specific error messages for duplicate phone/email (Requirement 31.10)
    - Call `authService.memberSelfRegister()` on successful validation
    - _Requirements: 31.5, 31.6, 31.10, 33.8, 33.9_
  
  - [ ] 3.3 Handle registration success and auto-login
    - Create MemberSession automatically upon successful registration
    - Redirect to member dashboard with welcome message: "Welcome to [Church Name]! Your account has been created and you're now logged in."
    - Display loading state during registration: "Creating Your Account..."
    - Disable submit button while processing
    - _Requirements: 31.8, 31.9, 31.14, 33.12_
  
  - [ ] 3.4 Add self-registration entry points
    - Add "Create Account" link on MemberLogin page
    - Add "Create Account" call-to-action button on landing page
    - Ensure registration route is publicly accessible without authentication
    - _Requirements: 33.1, 33.2, 33.3_

- [ ] 4. Implement QR-based check-in system
  - [ ] 4.1 Create CheckInPage component with QR payload parsing
    - Create new route `/check-in` accessible with or without authentication
    - Parse URL query parameters: churchId, serviceType, date, time from QR code
    - Implement `parseQRPayload()` function extracting parameters from URL
    - Default date to current date if not provided in QR code
    - Default time to current time if not provided in QR code
    - Validate serviceType against valid enum: "Sunday Service", "Midweek Service", "MAP Meeting", "Special Program"
    - _Requirements: 2.1, 2.3, 2.4, 15.1, 15.2, 15.3, 15.4, 15.5_
  
  - [ ] 4.2 Implement check-in authentication and session validation
    - Check for MemberSession on check-in page load
    - Redirect to member login if not authenticated, preserving return URL with query parameters
    - Display member name and profile picture for confirmation when authenticated
    - Validate memberId matches session.memberId (prevent checking in for others)
    - Validate churchId matches session.churchId (multi-tenant isolation)
    - _Requirements: 2.2, 2.5, 30.1, 30.2, 30.3, 30.5_
  
  - [ ] 4.3 Implement check-in submission and duplicate prevention
    - Display service details (service type, date, time) for member confirmation
    - Show large "Check In" button (minimum 44px height for touch optimization)
    - Call `attendanceService.checkInMember()` on button click
    - Handle duplicate detection - return existing record without creating new one
    - Display loading state: disable button and show "Checking in..." text
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 26.1_
  
  - [ ] 4.4 Implement check-in success confirmation with animation
    - Display animated checkmark icon on successful check-in
    - Show success message: "You've been marked present for [Service Type] on [Date]"
    - Use green color scheme for success state
    - Animate success message with fade-in effect
    - Display "Continue to Dashboard" button
    - Auto-redirect to member dashboard after 3 seconds
    - _Requirements: 1.6, 24.1, 24.2, 24.3, 24.4, 24.5_
  
  - [ ] 4.5 Implement check-in error handling
    - Display "Please log in to check in" with login link if session missing
    - Display "Connection failed. Please try again" for network errors
    - Display "Invalid QR code. Please try again or contact an usher." for invalid QR payload
    - Show "Try Again" button after any error
    - Log error details to browser console for debugging
    - _Requirements: 1.7, 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 4.6 Implement manual check-in fallback
    - Display service type dropdown when QR parameters are missing
    - Populate dropdown with: "Sunday Service", "Midweek Service", "MAP Meeting", "Special Program"
    - Display date picker for manual date selection
    - Default service type to "Sunday Service" if current day is Sunday
    - Require service type selection before enabling check-in button
    - _Requirements: 2.4, 15.6, 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [ ] 4.7 Optimize check-in page for mobile devices
    - Ensure page renders correctly on 320px-768px viewports
    - Use touch-optimized button sizes (minimum 44px × 44px)
    - Display service details and check-in button above the fold
    - Use large, readable fonts (minimum 14px body text, 18px buttons)
    - Display full-screen confirmation for 2 seconds on mobile after successful check-in
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 5. Checkpoint - Test QR check-in flow end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Redesign MemberDashboardView with tab-based navigation
  - [ ] 6.1 Create MemberDashboardView component structure with tab navigation
    - Create tab-based navigation with sections: Overview, Prayers, Profile, Events
    - Implement tab switching without page reload using local state
    - Apply visual styling to indicate active tab
    - Maintain navigation state during session (persist active tab in sessionStorage)
    - Default to "Overview" tab on first login
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 6.2 Create MemberHeader component
    - Display header banner on all authenticated member pages
    - Show churchName, mapName, member fullName, and profilePicture in header
    - Display memberId using monospace font
    - Include logout button calling `authService.logoutMember()`
    - Display profile picture or fallback avatar with member initials
    - Persist header across all tab navigation
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 17.4, 17.5_
  
  - [ ] 6.3 Implement Overview tab with profile info and attendance history
    - Create ProfileInfoCard displaying all member fields (read-only)
    - Group fields into sections: Personal Info, Church Assignments, Contact Details
    - Display lock icons on read-only fields: memberId, fullName, department, level, faculty, dateJoined, mapName
    - Add tooltip: "Contact church administrator to update this field"
    - Display birthday with cake icon, highlight if within 7 days
    - Display profilePicture or fallback avatar
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 18.1, 18.2, 18.3, 18.4, 19.1, 19.2, 19.3, 19.4_
  
  - [ ] 6.4 Implement AttendanceHistoryCard with filtering
    - Retrieve attendance via `attendanceService.getAttendanceHistoryForMember()`
    - Display records with date and service type, sorted by date descending
    - Categorize by service type with color coding (Sunday/Midweek/Prayer)
    - Display count totals for each service type category
    - Implement filter controls: service type selector and date range inputs
    - Display "Showing X of Y total records" when filters applied
    - Show empty state: "No attendance records found. Check in at your next service!"
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 21.1, 21.2, 21.3, 21.4, 29.1_
  
  - [ ] 6.5 Implement AttendanceStatsCard with calculated metrics
    - Call `attendanceService.calculateAttendanceStats()` to get metrics
    - Display total attendance count across all service types
    - Calculate and display participation rate percentage with 0 decimal places
    - Calculate and display current attendance streak
    - Display visual badge if streak exceeds 5 consecutive services
    - Show category breakdowns (Sunday services, midweek, prayer meetings)
    - Display "N/A" for participation rate when total services held is zero
    - Update statistics reactively when new attendance records added
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 27.4, 27.5_

- [ ] 7. Implement Prayers tab with submission and tracking
  - [ ] 7.1 Create PrayerSubmissionForm component
    - Create textarea input for prayer request text
    - Implement character counter showing remaining characters (max 500)
    - Set minimum character limit of 10 characters
    - Prevent text entry when 500 character limit reached
    - Display validation error: "Please provide more detail (minimum 10 characters)" for short requests
    - Validate prayer request is not empty before submission
    - _Requirements: 7.1, 7.3, 22.1, 22.2, 22.3, 22.4, 22.5_
  
  - [ ] 7.2 Implement prayer submission and confirmation
    - Call `prayerService.submitMemberPrayerRequest()` on form submit
    - Link prayer to member's phoneNumber and fullName from session
    - Set initial status to "Praying" for new requests
    - Display loading state: "Submitting..." text and disabled button
    - Show confirmation: "Your prayer request has been submitted to the intercessors team"
    - Clear textarea after successful submission
    - Display error message if submission fails
    - _Requirements: 7.2, 7.4, 7.5, 7.6, 7.7, 26.2_
  
  - [ ] 7.3 Create PrayerHistoryList component
    - Retrieve prayers via `prayerService.getMemberPrayerRequests()`
    - Display each prayer with dateSubmitted, request text, and status
    - Sort prayer requests by dateSubmitted in descending order
    - Use color-coded badges for status: "Praying" (blue), "Answered" (green), "Ongoing" (yellow)
    - Visually distinguish status values with appropriate colors
    - Show empty state: "You haven't submitted any prayer requests yet. Use the form to share your prayer needs."
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 29.2_

- [ ] 8. Implement Profile tab with editable fields and password management
  - [ ] 8.1 Create EditableFields component for member profile updates
    - Create form with editable fields: phoneNumber, email, residence, profilePicture URL
    - Mark phoneNumber as required, validate it's not empty
    - Validate email format using standard email regex if provided
    - Display visual distinction between editable and read-only fields
    - Add "Save" button with loading state
    - _Requirements: 4.1, 4.2, 4.3, 17.1, 17.2_
  
  - [ ] 8.2 Implement profile update submission
    - Call `memberService.updateMemberProfile()` with only editable fields
    - Validate that only allowed fields are being updated (phoneNumber, email, residence, profilePicture)
    - Display loading state: "Saving..." text and disabled button during save
    - Show success message: "Profile details saved successfully!" on success
    - Show error message with failure reason on error
    - Reload member data to reflect changes immediately after save
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 17.3, 26.3_
  
  - [ ] 8.3 Create PasswordManager component for password changes
    - Create form with fields: current password, new password, confirm new password
    - Implement password strength indicator for new password
    - Add show/hide toggle for all password fields
    - Validate new password meets requirements (min 8 chars, at least one number)
    - Validate new password matches confirm password
    - _Requirements: 32.4, 32.5_
  
  - [ ] 8.4 Implement password change submission
    - Call `authService.changeMemberPassword()` with current and new passwords
    - Verify current password before allowing change
    - Display error: "Incorrect current password" if verification fails
    - Hash new password before storing
    - Show success message: "Password updated successfully" on success
    - Display loading state during password change
    - _Requirements: 32.6, 32.11, 33.6_
  
  - [ ] 8.5 Create ReadOnlyFields component
    - Display non-editable fields: memberId, fullName, department, level, faculty, dateJoined, mapName, birthday
    - Show lock icon next to each read-only field
    - Display help text: "Contact church administrator to update this field"
    - Group read-only fields in separate visual section from editable fields
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 9. Implement Events tab with upcoming events display
  - [ ] 9.1 Create EventsList component
    - Display list of upcoming church events
    - Show for each event: title, date, time, location, category
    - Filter events to show only future dates (date >= current date)
    - Sort events by date in ascending order (soonest first)
    - Use category badges with visual indicators: program (blue), meeting (purple), special (red)
    - Limit event preview to 3-5 items on main dashboard
    - Show empty state: "No upcoming events scheduled. Check back soon!"
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 29.3_

- [ ] 10. Implement password reset flow for forgot password
  - [ ] 10.1 Create PasswordResetFlow component with multi-step process
    - Create first step: request form with email or phone input
    - Create second step: new password entry form with validation
    - Create third step: confirmation message
    - Implement step navigation between request → reset → confirmation
    - _Requirements: 33.4_
  
  - [ ] 10.2 Implement password reset request step
    - Validate email or phone format
    - Call `memberService.getMemberByPhoneOrEmail()` to find member
    - Display error: "No account found with this phone/email" if member not found
    - Progress to reset step if member found
    - _Requirements: 32.8_
  
  - [ ] 10.3 Implement new password entry and confirmation
    - Display new password field with strength indicator
    - Display confirm password field
    - Validate password meets requirements (min 8 chars, at least one number)
    - Validate passwords match
    - Call `authService.resetMemberPassword()` on submission
    - _Requirements: 32.9_
  
  - [ ] 10.4 Display reset confirmation and enable login
    - Show success message: "Password updated successfully. You can now log in with your new password."
    - Provide "Back to Login" button redirecting to member login page
    - Allow immediate login with new password
    - _Requirements: 33.5, 32.9_
  
  - [ ] 10.5 Add forgot password entry point
    - Add "Forgot Password?" link on MemberLogin page
    - Ensure password reset flow is publicly accessible without authentication
    - _Requirements: 33.4_

- [ ] 11. Checkpoint - Test complete member portal flows
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement session management and logout
  - [ ] 12.1 Implement session storage strategy
    - Store MemberSession in sessionStorage by default (cleared on browser close)
    - Store MemberSession in localStorage when "Remember Me" is checked
    - Use storage key: `futamap_saas_member_session`
    - Implement `saveMemberSession()`, `getMemberSession()`, and `clearMemberSession()` utility functions
    - _Requirements: 10.3_
  
  - [ ] 12.2 Implement logout functionality
    - Create logout button accessible from all member screens in header
    - Call `authService.logoutMember()` on logout button click
    - Clear MemberSession from both localStorage and sessionStorage
    - Redirect to landing page or member login after logout
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [ ] 12.3 Implement session validation and expiration handling
    - Check for valid MemberSession on all authenticated routes
    - Redirect to member login if session is missing or invalid
    - Preserve intended destination URL for post-login redirect
    - Display message: "Your session has expired. Please log in again." on expiration
    - _Requirements: 10.5_

- [ ] 13. Implement multi-tenant data isolation and security
  - [ ] 13.1 Implement tenant isolation enforcement
    - Filter all service method data requests by session.churchId
    - Validate churchId matches session.churchId before returning data
    - Throw error: "Access denied: Tenant mismatch" for churchId mismatches
    - Apply isolation to attendance, prayer, member, and event data
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_
  
  - [ ] 13.2 Implement check-in security validations
    - Always use session.memberId for attendance recording (never trust client input)
    - Validate memberId matches session.memberId in check-in requests
    - Validate churchId from QR code matches session.churchId
    - Reject requests with tenant/member mismatches
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5_
  
  - [ ] 13.3 Implement profile editing access control
    - Define EDITABLE_FIELDS constant: phoneNumber, email, residence, profilePicture
    - Define READ_ONLY_FIELDS constant: id, fullName, department, level, faculty, dateJoined, birthday, mapName, churchId, status
    - Validate profile updates only contain editable fields
    - Reject updates attempting to modify read-only fields
    - _Requirements: 4.1, 4.2_

- [ ] 14. Add mobile responsiveness and polish
  - [ ] 14.1 Implement mobile-responsive tab navigation
    - Convert tab navigation to horizontal scroll on mobile viewports
    - Stack cards vertically on mobile
    - Ensure all touch targets are minimum 44px × 44px
    - Use responsive breakpoints for mobile (320px-768px), tablet (768px-1024px), desktop (1024px+)
    - _Requirements: 12.1, 12.2_
  
  - [ ] 14.2 Implement responsive typography
    - Set minimum font sizes: 14px body text, 18px buttons, 16px form inputs
    - Use readable line heights (1.5-1.6 for body text)
    - Ensure text remains readable without zooming on mobile devices
    - _Requirements: 12.4_
  
  - [ ] 14.3 Add loading states for all async operations
    - Implement loading spinners for operations exceeding 500ms
    - Disable action buttons during processing
    - Show descriptive loading text: "Checking in...", "Submitting...", "Saving...", "Creating Your Account..."
    - Re-enable buttons and clear indicators when operations complete
    - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5_
  
  - [ ] 14.4 Implement empty states with guidance messages
    - Add empty state for attendance history with call-to-action
    - Add empty state for prayer requests with helpful guidance
    - Add empty state for events list
    - Use friendly, encouraging tone in all empty state messages
    - Include action buttons directing to relevant features
    - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5_
  
  - [ ] 14.5 Add error display components and toast notifications
    - Create Toast component for non-blocking notifications (success, error, warning, info)
    - Implement inline error displays for form validation
    - Create full-page error screen component for critical failures
    - Use consistent error styling and messaging throughout application
    - _Requirements: 1.7, 7.5, 13.1, 13.2, 13.3_

- [ ] 15. Implement legacy member authentication compatibility
  - [ ] 15.1 Add legacy authentication fallback in memberLogin
    - Check if member.passwordHash is null or undefined
    - Accept phone digits (cleaned) or "celebration2026" as temporary password for legacy members
    - Set passwordHash on successful legacy login for future security
    - Display prompt encouraging password creation: "Please set a custom password in your profile"
    - _Requirements: 32.12, 33.10_
  
  - [ ] 15.2 Add first-time password setup flow
    - Detect when legacy member logs in without passwordHash
    - Display modal or banner: "Secure your account by setting a custom password"
    - Provide direct link to password manager in profile tab
    - Skip prompt if member dismisses or sets password
    - _Requirements: 33.10_

- [ ] 16. Final checkpoint - Complete end-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks build incrementally on previous steps, with regular checkpoints for validation
- Each task references specific requirements from the requirements document for traceability
- Tasks focus exclusively on code implementation - no deployment, user testing, or manual acceptance testing
- The design uses TypeScript + React throughout, matching the existing project stack
- Service layer extensions (Phase 1) provide the foundation for all subsequent features
- Mobile responsiveness is integrated throughout, with dedicated polish tasks at the end
- Multi-tenant security and data isolation are enforced at the service layer and validated in check-in flows
