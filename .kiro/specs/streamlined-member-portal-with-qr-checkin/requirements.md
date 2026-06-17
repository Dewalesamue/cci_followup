# Requirements Document

## Introduction

This document defines requirements for transforming the member portal experience in the Celebration Church International Follow Up application. The existing member portal (`MemberDashboardView`) will be redesigned with an ultra-focused approach: members are data contributors and participants, NOT administrators. The primary objective is to make attendance check-in effortless through QR code scanning while providing essential visibility into personal records, prayer requests, and church events.

The system operates as a React + TypeScript multi-tenant SaaS application using Supabase as the backend database and authentication provider. Members authenticate through Supabase Auth with email/password and access their personalized dashboard with JWT token-based sessions.

## Glossary

- **Member_Portal**: The authenticated web interface accessible to registered church members after login
- **QR_Check_In_System**: The QR code-based attendance recording mechanism that enables one-click check-in
- **Attendance_Service**: Backend service using Supabase queries to manage attendance record creation and retrieval from the `attendance` table
- **Member_Service**: Backend service using Supabase queries to manage member profile data and updates in the `members` table
- **Prayer_Service**: Backend service using Supabase queries to manage prayer request submission and tracking in the `prayer_requests` table
- **Supabase_Client**: The `@supabase/supabase-js` client library instance managing all database operations and authentication
- **Service_Type**: Enumerated attendance categories (Sunday Service, Midweek Service, MAP Meeting, Special Program)
- **Member_Session**: Authentication session object managed by Supabase Auth, containing JWT token, user metadata, and churchId claim
- **Attendance_History**: Collection of historical attendance records for a specific member retrieved via Supabase query
- **Check_In_Page**: Dedicated route (`/check-in`) optimized for rapid QR-based attendance marking
- **Profile_Editor**: Limited interface allowing members to edit phone, email, and residence fields only
- **Prayer_Tracker**: Interface displaying submitted prayer requests with status updates from Supabase database
- **Church_Event**: Structured data representing upcoming programs, meetings, and special services stored in `church_events` table
- **Attendance_Streak**: Consecutive count of services attended without absence calculated from Supabase attendance records
- **Participation_Rate**: Percentage calculation of services attended versus total services held
- **Member_Registration_Service**: Public interface using Supabase Auth sign-up to create accounts without admin involvement
- **Supabase_Auth**: Supabase authentication provider managing password creation, hashing, JWT tokens, and session management
- **Self_Service_Portal**: Public registration and password reset interface accessible without authentication
- **RLS_Policy**: Row Level Security policies enforcing multi-tenant isolation by filtering all queries by churchId

## Requirements

### Requirement 1: QR-Based Service Check-In

**User Story:** As a member, I want to scan a QR code at church and check in with one click, so that I can quickly mark my attendance without friction.

#### Acceptance Criteria

1. WHEN a member scans a church QR code, THE Check_In_Page SHALL open with pre-populated service details
2. THE Check_In_Page SHALL auto-detect churchId, service type, date, and time from QR payload or URL parameters
3. WHEN service details are auto-detected, THE Check_In_Page SHALL display them for member confirmation
4. WHEN a member clicks "Check In", THE Attendance_Service SHALL insert an attendance record into Supabase `attendance` table with memberId, date, Service_Type, and churchId
5. IF an attendance record already exists in Supabase for the same member, date, and Service_Type, THEN THE Attendance_Service SHALL return the existing record without duplication
6. WHEN check-in succeeds, THE Check_In_Page SHALL display immediate confirmation: "You've been marked present for [Service_Type] on [Date]"
7. WHEN check-in fails, THE Check_In_Page SHALL display an error message with actionable guidance
8. THE Check_In_Page SHALL complete the entire flow (scan → confirm → done) in under 5 seconds for 95% of transactions

### Requirement 2: Dedicated Check-In Route

**User Story:** As a church administrator, I want members to access a dedicated check-in URL, so that QR codes can link directly to the optimized attendance flow.

#### Acceptance Criteria

1. THE Member_Portal SHALL expose a route at `/check-in` for attendance marking
2. WHEN `/check-in` is accessed without authentication, THE Member_Portal SHALL redirect to member login with return URL preserved
3. WHEN `/check-in` is accessed with query parameters `?churchId=X&serviceType=Y&date=Z`, THE Check_In_Page SHALL pre-populate these values
4. WHERE query parameters are missing, THE Check_In_Page SHALL provide manual selection dropdowns for Service_Type and date
5. WHEN `/check-in` is accessed with valid Member_Session, THE Check_In_Page SHALL display member name and profile picture for confirmation
6. THE Check_In_Page SHALL provide a "View My Dashboard" link after successful check-in

### Requirement 3: Personal Profile Viewing

**User Story:** As a member, I want to view my complete profile information, so that I can verify my records are accurate.

#### Acceptance Criteria

1. THE Member_Portal SHALL display read-only fields: fullName, memberId, department, level, faculty, dateJoined, birthday, mapName
2. THE Member_Portal SHALL display the member's current profilePicture if available
3. WHERE profilePicture is not set, THE Member_Portal SHALL display an avatar with the first letter of fullName
4. THE Member_Portal SHALL group profile fields into logical sections: Personal Info, Church Assignments, Contact Details
5. THE Member_Portal SHALL visually distinguish read-only fields from editable fields using styling or icons

### Requirement 4: Limited Profile Editing

**User Story:** As a member, I want to update my phone number, email, and residence, so that church leaders can contact me correctly.

#### Acceptance Criteria

1. THE Profile_Editor SHALL allow editing of phoneNumber, email, and residence fields ONLY
2. THE Profile_Editor SHALL prevent editing of memberId, fullName, department, level, faculty, dateJoined, birthday, mapName
3. WHEN a member submits profile updates, THE Member_Service SHALL validate that phoneNumber is not empty
4. WHEN validation passes, THE Member_Service SHALL save changes via `updateMember()` method
5. WHEN save succeeds, THE Profile_Editor SHALL display success message: "Profile details saved successfully!"
6. WHEN save fails, THE Profile_Editor SHALL display error message with failure reason
7. WHEN profile is updated, THE Profile_Editor SHALL reload member data to reflect changes immediately

### Requirement 5: Attendance History Display

**User Story:** As a member, I want to see my complete attendance history, so that I can track my participation and accountability.

#### Acceptance Criteria

1. THE Member_Portal SHALL retrieve attendance records via Supabase query filtering by memberId and churchId
2. THE Member_Portal SHALL display each attendance record with date and Service_Type
3. THE Member_Portal SHALL sort attendance records by date in descending order (most recent first)
4. THE Member_Portal SHALL categorize attendance by Service_Type: Sunday Service, Midweek meetings, Prayer gatherings
5. THE Member_Portal SHALL display count totals for each Service_Type category
6. WHERE no attendance records exist in Supabase, THE Member_Portal SHALL display message: "No attendance records found. Check in at your next service!"

### Requirement 6: Attendance Statistics and Metrics

**User Story:** As a member, I want to see my attendance statistics, so that I can understand my participation level and stay motivated.

#### Acceptance Criteria

1. THE Member_Portal SHALL calculate total attendance count across all Service_Type values
2. THE Member_Portal SHALL calculate Participation_Rate as (services attended / total services held in date range) × 100
3. THE Member_Portal SHALL calculate Attendance_Streak as consecutive services attended without absence
4. WHERE Attendance_Streak exceeds 5, THE Member_Portal SHALL display a visual badge or icon
5. THE Member_Portal SHALL display statistics in a dashboard card with clear labels and values
6. THE Member_Portal SHALL update statistics reactively when new attendance records are added

### Requirement 7: Prayer Request Submission

**User Story:** As a member, I want to submit prayer requests, so that church intercessors can pray for my needs.

#### Acceptance Criteria

1. THE Member_Portal SHALL provide a prayer request submission form with textarea input
2. WHEN a member submits a prayer request, THE Prayer_Service SHALL insert a PrayerRequest record into Supabase `prayer_requests` table linked to member's phoneNumber, fullName, and churchId
3. THE Member_Portal SHALL validate that prayer request text is not empty before submission
4. WHEN submission succeeds, THE Member_Portal SHALL display confirmation: "Your prayer request has been submitted to the intercessors team"
5. WHEN submission fails, THE Member_Portal SHALL display error message
6. THE Prayer_Service SHALL set initial status to "Praying" for new prayer requests
7. THE Member_Portal SHALL clear the textarea after successful submission

### Requirement 8: Prayer Request Tracking

**User Story:** As a member, I want to view my submitted prayer requests and their status, so that I can see how the church is responding to my needs.

#### Acceptance Criteria

1. THE Prayer_Tracker SHALL retrieve all PrayerRequest records from Supabase filtering by phoneNumber or fullName and churchId
2. THE Prayer_Tracker SHALL display each prayer request with dateSubmitted, request text, and status
3. THE Prayer_Tracker SHALL support status values: "Praying", "Answered", "Ongoing"
4. THE Prayer_Tracker SHALL sort prayer requests by dateSubmitted in descending order
5. THE Prayer_Tracker SHALL visually distinguish status values using color-coded badges
6. WHERE no prayer requests exist in Supabase, THE Prayer_Tracker SHALL display message: "You haven't submitted any prayer requests yet"

### Requirement 9: Church Events Display

**User Story:** As a member, I want to see upcoming church events, so that I can plan my participation in programs and meetings.

#### Acceptance Criteria

1. THE Member_Portal SHALL display a list of upcoming Church_Event items
2. THE Member_Portal SHALL display for each Church_Event: title, date, time, location, category
3. THE Member_Portal SHALL filter Church_Event items to show only future events (date >= current date)
4. THE Member_Portal SHALL sort Church_Event items by date in ascending order (soonest first)
5. THE Member_Portal SHALL categorize events using visual indicators: program, meeting, special
6. THE Member_Portal SHALL limit event preview to 3-5 items on main dashboard with "View All" link

### Requirement 10: Session Management and Logout

**User Story:** As a member, I want to securely log out of my session, so that my personal information remains protected on shared devices.

#### Acceptance Criteria

1. THE Member_Portal SHALL provide a logout button accessible from all member screens
2. WHEN a member clicks logout, THE Member_Portal SHALL call Supabase Auth `signOut()` method
3. WHEN logout completes, THE Member_Portal SHALL clear Supabase session and JWT token
4. WHEN logout completes, THE Member_Portal SHALL redirect to landing page or member login
5. WHEN Supabase session expires or is invalid, THE Member_Portal SHALL redirect to member login automatically

### Requirement 11: Simplified Navigation Structure

**User Story:** As a member, I want simple navigation between key sections, so that I can quickly access what I need without confusion.

#### Acceptance Criteria

1. THE Member_Portal SHALL provide tab-based navigation with sections: Overview, Prayers, Profile, Events
2. WHEN a member clicks a navigation tab, THE Member_Portal SHALL switch displayed content without page reload
3. THE Member_Portal SHALL visually indicate the active tab with distinct styling
4. THE Member_Portal SHALL maintain navigation state during session (persist active tab selection)
5. THE Member_Portal SHALL default to "Overview" tab on first login

### Requirement 12: Mobile-Responsive Check-In Experience

**User Story:** As a member using a mobile device, I want the check-in interface to work seamlessly on my phone, so that I can check in quickly while at church.

#### Acceptance Criteria

1. THE Check_In_Page SHALL render correctly on mobile viewports (320px to 768px width)
2. THE Check_In_Page SHALL use touch-optimized button sizes (minimum 44px × 44px)
3. THE Check_In_Page SHALL display service details and check-in button above the fold on mobile devices
4. THE Check_In_Page SHALL use large, readable fonts (minimum 14px for body text, 18px for buttons)
5. WHEN a mobile member completes check-in, THE Check_In_Page SHALL display full-screen confirmation for 2 seconds

### Requirement 13: Error Handling for Check-In Failures

**User Story:** As a member, I want clear error messages when check-in fails, so that I know what action to take.

#### Acceptance Criteria

1. IF Member_Session is missing during check-in attempt, THEN THE Check_In_Page SHALL display: "Please log in to check in" with login link
2. IF network error occurs during check-in, THEN THE Check_In_Page SHALL display: "Connection failed. Please try again"
3. IF Attendance_Service throws an error, THEN THE Check_In_Page SHALL display the error message from the service
4. THE Check_In_Page SHALL provide a "Try Again" button after any error
5. THE Check_In_Page SHALL log error details to browser console for debugging

### Requirement 14: Attendance Reminder Notifications

**User Story:** As a church administrator, I want the system to track members who missed services, so that follow-up reminders can be sent.

#### Acceptance Criteria

1. THE Attendance_Service SHALL identify members with zero attendance records in the past 14 days
2. THE Attendance_Service SHALL expose a method `getMembersRequiringFollowUp()` returning member IDs and last attendance date
3. THE Member_Portal SHALL NOT send notifications directly (this is an admin function)
4. THE Member_Portal SHALL display to members: participation rate and missed service count as passive accountability metrics

### Requirement 15: QR Code Payload Structure

**User Story:** As a system administrator, I want QR codes to encode check-in parameters, so that scanning automatically populates the check-in form.

#### Acceptance Criteria

1. THE QR_Check_In_System SHALL support QR codes encoding URLs in format: `https://[domain]/check-in?churchId=X&serviceType=Y&date=Z&time=T`
2. THE Check_In_Page SHALL parse URL parameters: churchId, serviceType, date, time
3. WHERE date parameter is missing, THE Check_In_Page SHALL default to current date
4. WHERE time parameter is missing, THE Check_In_Page SHALL default to current time
5. THE Check_In_Page SHALL validate that serviceType matches one of: "Sunday Service", "Midweek Service", "MAP Meeting", "Special Program"
6. IF serviceType is invalid, THEN THE Check_In_Page SHALL display manual Service_Type selector

### Requirement 16: Member Dashboard Header Display

**User Story:** As a member, I want to see my name and church information at the top of every page, so that I know I'm logged into the correct account.

#### Acceptance Criteria

1. THE Member_Portal SHALL display a header banner on all authenticated member pages
2. THE Member_Portal SHALL display in header: churchName, mapName, member fullName, profilePicture
3. THE Member_Portal SHALL display member ID (memberId) in header using monospace font
4. THE Member_Portal SHALL include logout button in header for quick access
5. THE Member_Portal SHALL persist header across all tab navigation within Member_Portal

### Requirement 17: Profile Picture Management

**User Story:** As a member, I want to update my profile picture URL, so that my photo displays correctly in the portal.

#### Acceptance Criteria

1. THE Profile_Editor SHALL provide an input field for profilePicture URL
2. WHEN a member enters a profilePicture URL, THE Profile_Editor SHALL validate it is a non-empty string
3. WHEN profile save occurs, THE Member_Service SHALL store profilePicture URL in member record
4. THE Member_Portal SHALL display profilePicture in header and profile section
5. WHERE profilePicture fails to load, THE Member_Portal SHALL display fallback avatar with member initials

### Requirement 18: Read-Only Administrative Fields Display

**User Story:** As a member, I want to understand which profile fields I cannot edit, so that I know what requires administrator assistance to change.

#### Acceptance Criteria

1. THE Member_Portal SHALL display lock icon or "Read-Only" badge next to non-editable fields
2. THE Member_Portal SHALL provide tooltip or help text explaining: "Contact church administrator to update this field"
3. THE Member_Portal SHALL group read-only fields in a separate visual section from editable fields
4. THE Member_Portal SHALL display administrative fields: memberId, fullName, department, level, faculty, dateJoined, mapName

### Requirement 19: Birthday Display in Profile

**User Story:** As a member, I want to see my birthday displayed in my profile, so that I can verify the church has the correct date for birthday recognition.

#### Acceptance Criteria

1. THE Member_Portal SHALL display birthday field in format: YYYY-MM-DD or MMM DD, YYYY
2. THE Member_Portal SHALL include a birthday icon (gift or cake) next to the birthday display
3. WHEN birthday is within 7 days, THE Member_Portal SHALL highlight the birthday field with special styling
4. THE Member_Portal SHALL mark birthday as read-only (member cannot edit)

### Requirement 20: Service Type Selection for Manual Check-In

**User Story:** As a member checking in without a QR code, I want to manually select the service type, so that I can still record my attendance.

#### Acceptance Criteria

1. WHERE QR code parameters are not provided, THE Check_In_Page SHALL display a Service_Type dropdown selector
2. THE Service_Type dropdown SHALL include options: "Sunday Service", "Midweek Service", "MAP Meeting", "Special Program"
3. THE Check_In_Page SHALL require Service_Type selection before enabling the check-in button
4. WHEN member selects Service_Type manually, THE Check_In_Page SHALL use selected value in attendance record creation
5. THE Check_In_Page SHALL default Service_Type to "Sunday Service" if current day is Sunday

### Requirement 21: Attendance History Filtering

**User Story:** As a member, I want to filter my attendance history by service type or date range, so that I can analyze specific participation patterns.

#### Acceptance Criteria

1. THE Member_Portal SHALL provide filter controls for Attendance_History: Service_Type selector and date range inputs
2. WHEN filters are applied, THE Member_Portal SHALL display only attendance records matching filter criteria
3. WHEN filters are cleared, THE Member_Portal SHALL display complete Attendance_History
4. THE Member_Portal SHALL display count of filtered records: "Showing X of Y total records"
5. THE Member_Portal SHALL persist filter state during active session

### Requirement 22: Prayer Request Character Limit

**User Story:** As a member submitting a prayer request, I want guidance on appropriate request length, so that I provide sufficient detail without overwhelming intercessors.

#### Acceptance Criteria

1. THE Member_Portal SHALL set maximum character limit of 500 characters for prayer request text
2. THE Member_Portal SHALL display character counter showing remaining characters as member types
3. WHEN character limit is reached, THE Member_Portal SHALL prevent additional text entry
4. THE Member_Portal SHALL set minimum character limit of 10 characters
5. WHEN prayer request is too short, THE Member_Portal SHALL display validation error: "Please provide more detail (minimum 10 characters)"

### Requirement 23: Multi-Tenant Church Isolation

**User Story:** As a member of a specific church tenant, I want to see only data belonging to my church, so that my information remains private and secure.

#### Acceptance Criteria

1. THE Member_Portal SHALL filter all Supabase data requests by Member_Session.churchId via RLS policies
2. THE Attendance_Service SHALL return only attendance records from Supabase where churchId matches Member_Session.churchId
3. THE Prayer_Service SHALL return only prayer requests from Supabase where churchId matches Member_Session.churchId
4. THE Member_Service SHALL return only member profile from Supabase where churchId matches Member_Session.churchId
5. IF Member_Session.churchId does not match requested resource churchId, THEN THE Member_Portal SHALL deny access with error: "Access denied: Tenant mismatch"

### Requirement 24: Check-In Success Animation

**User Story:** As a member completing check-in, I want visual confirmation that my attendance was recorded, so that I feel confident the action succeeded.

#### Acceptance Criteria

1. WHEN check-in succeeds, THE Check_In_Page SHALL display animated checkmark icon or success indicator
2. THE Check_In_Page SHALL animate the success message with fade-in or slide-in effect
3. THE Check_In_Page SHALL use green color scheme for success state
4. THE Check_In_Page SHALL automatically redirect to member dashboard after 3 seconds
5. THE Check_In_Page SHALL provide "Continue to Dashboard" button for immediate navigation

### Requirement 25: Events Calendar Integration Preparation

**User Story:** As a church administrator, I want event data to be structured for future calendar integration, so that the system can support advanced scheduling features.

#### Acceptance Criteria

1. THE Church_Event data structure SHALL include fields: id, title, date (YYYY-MM-DD), time (HH:MM AM/PM), location, category
2. THE Member_Portal SHALL parse and display date field in human-readable format
3. THE Member_Portal SHALL parse and display time field in 12-hour format with AM/PM
4. THE Member_Portal SHALL support category values: "program", "meeting", "special"
5. THE Member_Portal SHALL sort events chronologically for calendar-style display

### Requirement 26: Loading States for Async Operations

**User Story:** As a member performing actions like check-in or prayer submission, I want to see loading indicators, so that I know the system is processing my request.

#### Acceptance Criteria

1. WHEN check-in is processing, THE Check_In_Page SHALL disable the check-in button and display "Checking in..." text
2. WHEN prayer request is submitting, THE Member_Portal SHALL disable submit button and display "Submitting..." text
3. WHEN profile is saving, THE Profile_Editor SHALL disable save button and display "Saving..." text
4. THE Member_Portal SHALL show loading spinner or progress indicator for operations exceeding 500ms
5. WHEN operation completes, THE Member_Portal SHALL re-enable buttons and clear loading indicators

### Requirement 27: Participation Rate Calculation Logic

**User Story:** As a member viewing my statistics, I want accurate participation rate calculation, so that I can understand my attendance level correctly.

#### Acceptance Criteria

1. THE Member_Portal SHALL calculate Participation_Rate as: (member attendance count / total services held) × 100
2. THE Member_Portal SHALL determine total services held by counting distinct date + Service_Type combinations in churchId attendance data
3. THE Member_Portal SHALL support custom date range for Participation_Rate calculation (e.g., last 30 days, last 90 days)
4. THE Member_Portal SHALL display Participation_Rate as percentage with 0 decimal places
5. WHERE total services held is zero, THE Member_Portal SHALL display "N/A" instead of division error

### Requirement 28: Streak Calculation with Absence Handling

**User Story:** As a member, I want my attendance streak to reset after missing a service, so that the metric accurately reflects consecutive participation.

#### Acceptance Criteria

1. THE Member_Portal SHALL calculate Attendance_Streak by counting consecutive attendance records without gaps
2. THE Member_Portal SHALL consider a service "missed" when date has passed and no attendance record exists for that Service_Type
3. THE Member_Portal SHALL reset Attendance_Streak to zero after any missed service
4. THE Member_Portal SHALL calculate streak separately for each Service_Type category
5. THE Member_Portal SHALL display highest streak across all Service_Type categories as primary metric

### Requirement 29: Empty State Guidance

**User Story:** As a new member with no historical data, I want helpful messages explaining what I should do, so that I understand how to use the portal effectively.

#### Acceptance Criteria

1. WHERE Attendance_History is empty, THE Member_Portal SHALL display: "No attendance records found. Scan the QR code at your next service to get started!"
2. WHERE Prayer_Tracker has no requests, THE Member_Portal SHALL display: "You haven't submitted any prayer requests yet. Use the form to share your prayer needs."
3. WHERE Church_Event list is empty, THE Member_Portal SHALL display: "No upcoming events scheduled. Check back soon!"
4. THE Member_Portal SHALL include call-to-action buttons in empty states directing to relevant features
5. THE Member_Portal SHALL use friendly, encouraging tone in all empty state messages

### Requirement 30: Security - Member Cannot Edit Others' Attendance

**User Story:** As a system administrator, I want to ensure members can only mark their own attendance, so that attendance data integrity is maintained.

#### Acceptance Criteria

1. THE Check_In_Page SHALL automatically set memberId to Member_Session.memberId for all check-in requests
2. THE Check_In_Page SHALL NOT expose UI controls for selecting different members
3. THE Attendance_Service SHALL reject attendance creation requests where memberId does not match authenticated Member_Session.memberId
4. IF tampering is detected, THEN THE Attendance_Service SHALL log security warning and return error
5. THE Member_Portal SHALL prevent URL parameter manipulation by validating memberId against Member_Session

### Requirement 31: Member Self-Registration Flow

**User Story:** As a prospective member, I want to create my own account with a custom password, so that I can access the member portal without waiting for administrator approval.

#### Acceptance Criteria

1. THE Self_Service_Portal SHALL expose a public registration route accessible from the landing page
2. THE Self_Service_Portal SHALL display "Create Account" link on the member login page
3. WHEN a prospective member accesses registration, THE Self_Service_Portal SHALL display a form collecting: fullName, phoneNumber, email, gender, department, level, faculty, residence, birthday, mapName, password
4. THE Self_Service_Portal SHALL require password input with minimum length of 8 characters and at least one numeric character
5. WHEN a member submits registration, THE Member_Registration_Service SHALL validate that phoneNumber is unique in Supabase `members` table across the selected churchId
6. WHEN a member submits registration, THE Member_Registration_Service SHALL validate that email (if provided) is unique in Supabase `members` table across the selected churchId
7. WHEN validation passes, THE Member_Registration_Service SHALL use Supabase Auth `signUp()` to create user account with email/password
8. WHEN Supabase Auth signup succeeds, THE Member_Registration_Service SHALL insert member record into Supabase `members` table with user_id from Auth
9. WHEN registration succeeds, THE Member_Registration_Service SHALL create Member_Session automatically via Supabase Auth JWT token (member is logged in immediately)
10. WHEN registration succeeds, THE Self_Service_Portal SHALL redirect to Member_Portal dashboard with welcome message
11. IF phoneNumber or email already exists in Supabase, THEN THE Member_Registration_Service SHALL return error: "An account with this phone number/email already exists"
12. THE Self_Service_Portal SHALL display password strength indicator as member types password
13. THE Self_Service_Portal SHALL include "Show/Hide Password" toggle for password visibility
14. THE Self_Service_Portal SHALL display all required fields with asterisk (*) indicator
15. WHEN registration is processing, THE Self_Service_Portal SHALL disable submit button and display "Creating Your Account..." loading state

### Requirement 32: Password Management System

**User Story:** As a member, I want to manage my account password independently, so that I control my authentication credentials without admin dependency.

#### Acceptance Criteria

1. WHEN a member creates an account via self-registration, THE Supabase_Auth SHALL hash and store the password securely
2. THE Supabase_Auth SHALL validate password strength: minimum 8 characters, at least one number (0-9)
3. IF password does not meet strength requirements, THEN THE Supabase_Auth SHALL return error: "Password must be at least 8 characters and contain at least one number"
4. THE Member_Portal SHALL provide "Change Password" feature in profile settings using Supabase Auth `updateUser()` method
5. WHEN a member requests password change, THE Supabase_Auth SHALL require current password verification before allowing new password
6. WHEN password change succeeds, THE Supabase_Auth SHALL hash new password and update user authentication record
7. THE Supabase_Auth SHALL support password reset via "Forgot Password" flow using Supabase Auth `resetPasswordForEmail()` method
8. WHEN a member initiates password reset, THE Self_Service_Portal SHALL require email verification via Supabase Auth magic link
9. WHEN password reset succeeds, THE Self_Service_Portal SHALL allow immediate login with new password
10. THE Supabase_Auth SHALL NOT store passwords in plaintext (handled automatically by Supabase Auth bcrypt hashing)
11. WHEN a member logs in, THE Supabase_Auth SHALL use built-in `signInWithPassword()` method for secure authentication

### Requirement 33: Self-Service Account Control

**User Story:** As a member, I want full control over my account creation and password management, so that I don't depend on administrators for basic authentication tasks.

#### Acceptance Criteria

1. THE Self_Service_Portal SHALL be accessible without authentication for new account creation
2. THE Self_Service_Portal SHALL display prominent "Create Account" call-to-action on member login page
3. WHEN a new user clicks "Create Account", THE Self_Service_Portal SHALL navigate to registration form without requiring admin assistance
4. THE Member_Portal SHALL provide "Forgot Password" link on login page directing to password reset flow
5. WHEN a member completes password reset, THE Self_Service_Portal SHALL confirm: "Password updated successfully. You can now log in with your new password."
6. THE Member_Portal SHALL allow password changes from profile settings without admin intervention using Supabase Auth
7. THE Self_Service_Portal SHALL validate email format using standard email regex pattern
8. THE Self_Service_Portal SHALL validate phone number format (accept formats: +234XXXXXXXXXX, 0XXXXXXXXXXX, or international formats)
9. WHERE a member has authenticated via Supabase Auth, THE Supabase_Auth SHALL manage session via JWT tokens stored securely by Supabase client
10. THE Self_Service_Portal SHALL provide clear instructions distinguishing self-registration (for new members) from admin registration (for bulk onboarding)
11. WHEN self-registration succeeds, THE Self_Service_Portal SHALL display welcome message: "Welcome to [Church Name]! Your account has been created and you're now logged in."

