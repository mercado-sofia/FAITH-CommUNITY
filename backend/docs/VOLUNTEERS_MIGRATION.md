# Volunteers System Migration Guide

## Overview
The volunteers system has been migrated from a standalone table structure to use the new `users` table for authentication and profile data. This migration eliminates data duplication and provides a more consistent user experience.

## Changes Made

### Database Changes

1. **Users Table Updates:**
   - Added `full_name` column (computed from `first_name` + `last_name`)
   - Added `profile_photo_url` column for user profile photos

2. **Volunteers Table Restructure:**
   - **Old Structure:** `volunteers` table contained all user data (full_name, age, gender, email, phone_number, address, occupation, citizenship, valid_id)
   - **New Structure:** `volunteers` table now only contains:
     - `id` (primary key)
     - `user_id` (foreign key to users table)
     - `program_id` (foreign key to programs_projects table)
     - `reason` (application reason)
     - `status` (Pending/Approved/Declined)
     - `created_at`, `updated_at` (timestamps)

### Backend Changes

1. **Volunteer Controllers:**
   - Updated `applyVolunteer` to require `user_id` instead of individual user fields
   - Updated `getAllVolunteers` to JOIN with users table and calculate age from birth_date
   - Removed `valid_id` handling from all functions
   - Added user existence and duplicate application checks

2. **API Routes:**
   - Removed multer file upload configuration for valid_id
   - Updated routes to not require file uploads

3. **Data Structure:**
   - Age is now calculated from `birth_date` in the users table
   - Contact information comes from `contact_number` in users table
   - Profile photos are stored in `profile_photo_url` in users table

### Frontend Changes

1. **Volunteers API:**
   - Updated field mappings to use new data structure
   - Removed `validIdFilename` references
   - Added `profile_photo_url` and `user_id` fields

2. **Volunteer Table Components:**
   - Updated ViewDetailsModal to show profile photos instead of valid IDs
   - Removed valid ID download functionality
   - Updated image display to use profile photos

## Migration Process

### Automatic Migration
The database initialization script will automatically:
1. Add the `full_name` column to the users table
2. Create the new volunteers table structure
3. Drop the old volunteers table if it exists with the old structure

### Manual Steps Required
1. **Data Migration:** If you have existing volunteer data, you'll need to:
   - Create user accounts for existing volunteers
   - Link volunteer applications to user accounts
   - Migrate profile photos from valid_id to profile_photo_url

2. **Frontend Updates:**
   - Update any volunteer application forms to use user authentication
   - Remove valid_id upload functionality
   - Update any hardcoded references to old field names

## Benefits of New Structure

1. **Data Consistency:** User information is stored in one place
2. **Authentication Integration:** Volunteers are now authenticated users
3. **Profile Management:** Users can update their information in one place
4. **Reduced Duplication:** No more duplicate user data across tables
5. **Better Security:** User data is properly managed through authentication system

## API Changes

### Volunteer Application
**Old:**
```json
{
  "program_id": 1,
  "fullName": "John Doe",
  "age": 25,
  "gender": "Male",
  "email": "john@example.com",
  "phoneNumber": "1234567890",
  "address": "123 Main St",
  "occupation": "Student",
  "citizenship": "Filipino",
  "reason": "I want to help"
}
```

**New:**
```json
{
  "program_id": 1,
  "user_id": 123,
  "reason": "I want to help"
}
```

### Volunteer Data Response
**Old:**
```json
{
  "id": 1,
  "full_name": "John Doe",
  "age": 25,
  "gender": "Male",
  "email": "john@example.com",
  "phone_number": "1234567890",
  "address": "123 Main St",
  "occupation": "Student",
  "citizenship": "Filipino",
  "valid_id": "/uploads/volunteers/valid-ids/id123.jpg"
}
```

**New:**
```json
{
  "id": 1,
  "user_id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "full_name": "John Doe",
  "age": 25,
  "gender": "Male",
  "email": "john@example.com",
  "contact_number": "1234567890",
  "address": "123 Main St",
  "occupation": "Student",
  "citizenship": "Filipino",
  "profile_photo_url": "/uploads/user-profile/photo123.jpg"
}
```

## Testing

After migration, test the following:
1. Volunteer application submission
2. Admin volunteer listing
3. Volunteer detail viewing
4. Status updates
5. Profile photo display
6. Age calculation from birth_date

## Rollback Plan

If issues arise, you can:
1. Restore the old volunteers table structure
2. Revert the controller changes
3. Restore the frontend API mappings
4. Re-enable valid_id upload functionality

However, this would require manual data migration back to the old structure.
