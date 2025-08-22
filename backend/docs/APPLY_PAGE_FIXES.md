# Apply Page Fixes and Volunteer System Updates

## Overview
Fixed the Apply page to work correctly with the new volunteer system structure and ensure proper organization filtering for admin portals.

## Issues Fixed

### 1. **Frontend Form Structure**
- **Problem**: Form was sending old data structure with individual user fields
- **Fix**: Updated to send only `program_id` and `reason`, with `user_id` extracted from JWT token

### 2. **API Endpoint**
- **Problem**: Form was posting to wrong endpoint (`/api/volunteers`)
- **Fix**: Updated to use correct endpoint (`/api/apply`)

### 3. **Authentication**
- **Problem**: No authentication required for volunteer applications
- **Fix**: Added JWT token authentication middleware to `/api/apply` route

### 4. **Admin Organization Filtering**
- **Problem**: Admin volunteers page wasn't properly filtering by organization
- **Fix**: Added missing route `/api/volunteers/admin/:adminId` to admin routes

### 5. **Data Validation**
- **Problem**: No validation for program existence and status
- **Fix**: Added validation to ensure program exists and is "Upcoming"

## Changes Made

### Backend Changes

#### 1. **applyController.js**
```javascript
// Updated submitVolunteer function
export const submitVolunteer = async (req, res) => {
  // Get user_id from JWT token instead of request body
  const user_id = req.user?.id;
  
  // Added program validation
  const [programRows] = await db.execute(
    'SELECT id, status FROM programs_projects WHERE id = ? AND status = "Upcoming"',
    [program_id]
  );
}
```

#### 2. **apply.js routes**
```javascript
// Added authentication middleware
router.post('/apply', verifyToken, submitVolunteer);
```

#### 3. **admin/volunteers.js routes**
```javascript
// Added organization-specific route
router.get('/admin/:adminId', getVolunteersByAdminOrg);
```

### Frontend Changes

#### 1. **VolunteerForm.js**
```javascript
// Updated request structure
const requestData = {
  program_id: formData.program.id,
  reason: formData.reason.trim()
};

// Updated API call
const response = await fetch(`${API_URL}/api/apply`, {
  method: "POST",
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
  },
  body: JSON.stringify(requestData),
});
```

#### 2. **applyApi.js**
```javascript
// Updated submitApplication mutation
submitApplication: builder.mutation({
  query: (formData) => ({
    url: "/apply",
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('userToken')}`
    },
    body: formData
  }),
})
```

## Data Flow

### 1. **User Application Process**
1. User logs in and navigates to Apply page
2. User selects a program and provides reason
3. Form submits to `/api/apply` with JWT token
4. Backend extracts `user_id` from JWT token
5. Backend validates program exists and is "Upcoming"
6. Application is stored in `volunteers` table

### 2. **Admin View Process**
1. Admin logs into admin portal
2. Admin navigates to volunteers page
3. System calls `/api/volunteers/admin/:adminId`
4. Backend filters volunteers by admin's organization
5. Only volunteers for programs from admin's organization are shown

## Security Improvements

1. **Authentication Required**: All volunteer applications require valid JWT token
2. **User ID Protection**: User ID is extracted from token, not sent in request body
3. **Program Validation**: Only "Upcoming" programs can receive applications
4. **Organization Isolation**: Admins only see volunteers for their organization's programs

## Testing Checklist

### Apply Page Testing
- [ ] User can log in and access Apply page
- [ ] User can select a program from dropdown
- [ ] User can enter application reason
- [ ] Form submits successfully
- [ ] Success message is displayed
- [ ] Duplicate applications are prevented

### Admin Portal Testing
- [ ] Admin can log in and access volunteers page
- [ ] Only volunteers for admin's organization programs are shown
- [ ] Volunteer details include all required information
- [ ] Status updates work correctly
- [ ] Profile photos display properly (instead of valid_id)

### Data Integrity Testing
- [ ] Volunteer applications are properly linked to user accounts
- [ ] Age is calculated correctly from birth_date
- [ ] Organization filtering works correctly
- [ ] No data duplication between users and volunteers tables

## Benefits

1. **Improved Security**: JWT-based authentication prevents unauthorized applications
2. **Better Data Integrity**: No duplicate user data, proper foreign key relationships
3. **Organization Isolation**: Admins only see relevant volunteer applications
4. **Simplified Maintenance**: Single source of truth for user data
5. **Enhanced User Experience**: Profile photos instead of valid_id uploads
