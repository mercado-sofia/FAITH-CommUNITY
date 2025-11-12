# Data Flow

## Request Flow (Frontend to Backend)

```
1. User Action (Frontend)
   ↓
2. API Call (RTK Query / SWR / Fetch)
   ↓
3. API Client (authenticatedFetch / baseQueryWithReauth)
   ↓
4. Token Check & Refresh (if needed)
   ↓
5. HTTP Request (with Authorization header)
   ↓
6. Backend Middleware Stack
   ├─ Helmet (Security Headers)
   ├─ CORS (Origin Validation)
   ├─ Rate Limiting
   ├─ CSRF Protection (if applicable)
   └─ Body Parsing
   ↓
7. Route Handler
   ↓
8. Authentication Middleware
   ├─ JWT Verification
   ├─ Session Validation (admin/superadmin)
   └─ Role-Based Access Control
   ↓
9. Controller Function
   ├─ Input Validation
   ├─ Business Logic
   ├─ Database Operations
   └─ Response Generation
   ↓
10. Response (JSON)
   ↓
11. Frontend State Update (RTK Query / SWR)
   ↓
12. UI Update (React Re-render)
```

## Data Flow Patterns

### 1. Public User Data Flow

**Example: User Applies to Program**

```
Frontend (Apply Form)
  ↓
POST /api/applications
  Headers: { Authorization: Bearer <access_token> }
  Body: { program_id, reason }
  ↓
Backend: verifyAccessToken() → Validates JWT
  ↓
Backend: applyController.createApplication()
  ↓
Database: INSERT INTO volunteers (user_id, program_id, reason, status)
  ↓
Database: SELECT program details for notification
  ↓
Backend: Create notification for admin
  ↓
Backend: Send email notification (optional)
  ↓
Response: { success: true, application_id: 123 }
  ↓
Frontend: Update UI, show success message
```

### 2. Admin Data Flow

**Example: Admin Submits Program for Approval**

```
Frontend (Admin Portal - Create Program)
  ↓
POST /api/programs
  Headers: { Authorization: Bearer <admin_token> }
  Body: { title, description, ... }
  ↓
Backend: verifyAdminToken() → Validates JWT + Session
  ↓
Backend: programsController.addProgramProject()
  ↓
Database: START TRANSACTION
  ↓
Database: INSERT INTO submissions (status='pending', ...)
  ↓
Database: If collaborative:
  - INSERT INTO program_collaborations (status='pending')
  - Send collaboration requests
  ↓
Database: INSERT INTO superadmin_notifications
  ↓
Database: COMMIT TRANSACTION
  ↓
Response: { message: 'Project submitted for approval', id: 456 }
  ↓
Frontend: Show success message, redirect to submissions page
```

### 3. Superadmin Data Flow

**Example: Superadmin Approves Submission**

```
Frontend (Superadmin Portal - Approvals Page)
  ↓
GET /api/approvals/pending
  Headers: { Authorization: Bearer <superadmin_token> }
  ↓
Backend: verifySuperadminToken() → Validates JWT + Session
  ↓
Backend: approvalController.getPendingSubmissions()
  ↓
Database: SELECT submissions WHERE status='pending'
  JOIN organizations, admins
  ↓
Response: { success: true, data: [submissions...] }
  ↓
Frontend: Display submissions in UI
  ↓
User clicks "Approve"
  ↓
POST /api/approvals/approve
  Headers: { Authorization: Bearer <superadmin_token> }
  Body: { submission_id: 123 }
  ↓
Backend: approvalController.approveSubmission()
  ↓
Database: START TRANSACTION
  ↓
Database: 
  - UPDATE organizations SET ... (if section='organization')
  - OR INSERT INTO programs_projects (if section='programs')
  - UPDATE submissions SET status='approved'
  - INSERT INTO admin_notifications
  ↓
Database: COMMIT TRANSACTION
  ↓
Response: { success: true, message: 'Submission approved' }
  ↓
Frontend: Update UI, show success message
```

## State Management Flow

### Frontend State Architecture

**Redux Toolkit (RTK Query):**
- **API Slices**: Separate slices for each resource (programs, organizations, submissions, etc.)
- **Caching**: Automatic caching with configurable TTL
- **Auto-refetching**: Automatic refetching on window focus, network reconnect
- **Optimistic Updates**: Support for optimistic UI updates

**SWR (React Hooks for Data Fetching):**
- **Real-time Sync**: Automatic revalidation
- **Deduplication**: Prevents duplicate requests
- **Error Retry**: Automatic retry on failure
- **Focus Revalidation**: Refetches on window focus

**React Context:**
- **Navigation Context**: Global navigation state
- **Auth State**: Authentication state management

### Data Synchronization

**Cache Invalidation:**
- RTK Query: Manual invalidation via `invalidateTags`
- SWR: Automatic revalidation on mutation

**Real-time Updates:**
- Polling: SWR polls for updates at intervals
- Manual Refresh: User-triggered refresh via `mutate()`

## Database Transaction Flow

**Critical Operations Use Transactions:**

```javascript
// Example: Approving a submission
await db.query("START TRANSACTION")
try {
  // Update organization
  await db.execute("UPDATE organizations SET ...")
  
  // Update submission status
  await db.execute("UPDATE submissions SET status='approved'")
  
  // Create notification
  await db.execute("INSERT INTO admin_notifications ...")
  
  await db.query("COMMIT")
} catch (error) {
  await db.query("ROLLBACK")
  throw error
}
```

## File Upload Flow

**Example: Admin Uploads Post Act Report**

```
Frontend (File Upload Form)
  ↓
POST /api/upload/post-act-report/:program_id
  Headers: { Authorization: Bearer <admin_token> }
  Body: FormData with file
  ↓
Backend: verifyAdminToken()
  ↓
Backend: Multer middleware (file parsing)
  ↓
Backend: Cloudinary upload
  - Upload file to Cloudinary
  - Get public_id and URL
  ↓
Database: START TRANSACTION
  ↓
Database:
  - INSERT INTO program_post_act_reports (status='pending')
  - INSERT INTO submissions (section='Post Act Report', status='pending')
  - INSERT INTO superadmin_notifications
  ↓
Database: COMMIT TRANSACTION
  ↓
Response: { success: true, file_url: '...', report_id: 789 }
  ↓
Frontend: Show success message, update UI
```

## Notification Flow

**Notification Creation:**
1. Event occurs (submission created, approval, etc.)
2. Controller creates notification record in database
3. Notification stored in appropriate table:
   - `admin_notifications` for admin notifications
   - `superadmin_notifications` for superadmin notifications
   - `user_notifications` for user notifications

**Notification Delivery:**
1. Frontend polls for notifications (SWR/RTK Query)
2. Backend returns unread notifications
3. Frontend displays notification badge/count
4. User clicks notification → marks as read
5. Backend updates `is_read = true`

## Error Handling Flow

```
Request Error
  ↓
Backend: Error caught in controller
  ↓
Backend: Log error (Pino logger)
  ↓
Backend: Determine error type
  ├─ Validation Error → 400 Bad Request
  ├─ Authentication Error → 401 Unauthorized
  ├─ Authorization Error → 403 Forbidden
  ├─ Not Found → 404 Not Found
  └─ Server Error → 500 Internal Server Error
  ↓
Response: { success: false, error: 'Error message' }
  ↓
Frontend: Error handler catches response
  ↓
Frontend: Display error message to user
  ↓
Frontend: Log error (console/error tracking service)
```

## Data Validation Flow

```
User Input
  ↓
Frontend: Basic validation (required fields, format)
  ↓
API Request
  ↓
Backend: Input validation middleware
  ├─ JSON schema validation
  ├─ Type checking
  └─ Business rule validation
  ↓
If Invalid: Return 400 with validation errors
  ↓
If Valid: Proceed to controller
  ↓
Controller: Additional business logic validation
  ↓
Database: Constraint validation (foreign keys, unique constraints)
  ↓
If Database Error: Rollback transaction, return error
  ↓
If Success: Return success response
```

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

