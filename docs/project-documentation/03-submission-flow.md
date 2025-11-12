# Submission Flow (Admin to Superadmin)

## Overview
The submission system enables admins to propose changes to their organization's data, which must be approved by a superadmin before being applied to the database.

## Submission Types

1. **Organization Information**: Updates to organization details (name, description, logo, etc.)
2. **Programs**: New program submissions or updates to existing programs
3. **Post Act Reports**: Post-activity reports for completed programs
4. **Highlights**: Organization highlights requiring approval
5. **News**: News articles (some may require approval)

## Submission Workflow

### Step 1: Admin Creates Submission

**Process:**
1. Admin makes changes in the admin portal (e.g., edits organization info, creates a program)
2. Changes are stored in `submissions` table with:
   - `previous_data`: Current state (JSON)
   - `proposed_data`: Proposed changes (JSON)
   - `section`: Type of submission (e.g., "organization", "programs", "Post Act Report")
   - `status`: Set to "pending"
   - `submitted_by`: Admin ID
   - `organization_id`: Organization ID

**Special Cases:**
- **Advocacy & Competency**: Saved directly (bypass submission workflow)
- **Collaborative Programs**: Collaboration requests sent immediately to invited organizations

**Code Location:**
- `backend/src/admin/controllers/submissionController.js` - `submitChanges()`
- `backend/src/admin/controllers/programsController.js` - `addProgramProject()`

### Step 2: Notification to Superadmin

**Process:**
1. Upon submission creation, a notification is created in `superadmin_notifications` table
2. Notification includes:
   - `type`: "approval_request"
   - `title`: Descriptive title (e.g., "New Program Submission")
   - `message`: Detailed message about the submission
   - `section`: Submission section type
   - `submission_id`: Reference to the submission
   - `organization_id`: Organization that submitted

**Code Location:**
- `backend/src/admin/controllers/submissionController.js` - Lines 193-230
- `backend/src/admin/controllers/programsController.js` - Lines 1857-1883

### Step 3: Superadmin Reviews Submission

**Process:**
1. Superadmin accesses the approvals page
2. System fetches all pending submissions:
   - Filters by `status = 'pending'`
   - Includes organization and admin details
   - Enriches collaborator data for program submissions
3. Superadmin can:
   - View previous data vs. proposed data
   - Approve the submission
   - Reject the submission (with optional reason)

**Code Location:**
- `backend/src/superadmin/controllers/approvalController.js` - `getPendingSubmissions()`

### Step 4: Approval Process

**When Superadmin Approves:**

1. **For Organization Updates:**
   - Updates `organizations` table with proposed data
   - Updates submission status to "approved"
   - Creates notification for admin

2. **For Program Submissions:**
   - **Non-Collaborative Programs:**
     - Creates program in `programs_projects` table
     - Sets `is_approved = true`
     - Updates submission status to "approved"
     - Sends email to newsletter subscribers (if configured)
   
   - **Collaborative Programs:**
     - Updates submission status to "approved_pending_collaboration"
     - Program is NOT created yet
     - Collaboration requests already sent (from Step 1)
     - Waits for all collaborators to accept
     - Program created only after all collaborators accept

3. **For Post Act Reports:**
   - Updates `program_post_act_reports` table status to "approved"
   - Updates submission status to "approved"
   - Creates notification for admin

**Code Location:**
- `backend/src/superadmin/controllers/approvalController.js` - `approveSubmission()`

### Step 5: Rejection Process

**When Superadmin Rejects:**

1. Updates submission status to "rejected"
2. Stores rejection reason in `rejection_reason` field
3. Creates notification for admin with rejection details
4. For unapproved programs: Cleans up program and related records
5. For collaborative programs: Cleans up collaboration records

**Code Location:**
- `backend/src/superadmin/controllers/approvalController.js` - `rejectSubmission()`

### Step 6: Admin Notification

**Process:**
1. Upon approval/rejection, notification created in `admin_notifications` table
2. Admin receives notification with:
   - `type`: "approval" or "decline"
   - `title`: Submission title
   - `message`: Approval/rejection message
   - `submission_id`: Reference to submission
   - `section`: Submission section type

**Code Location:**
- `backend/src/admin/controllers/notificationController.js`

## Submission States

```
pending → approved → (applied to database)
pending → rejected → (changes discarded)
pending → approved_pending_collaboration → (waiting for collaborators) → approved
```

## Database Schema

**submissions Table:**
```sql
- id: Primary key
- organization_id: Foreign key to organizations
- section: Submission type (ENUM)
- previous_data: Current state (JSON)
- proposed_data: Proposed changes (JSON)
- submitted_by: Admin ID (Foreign key)
- status: 'pending', 'approved', 'rejected', 'approved_pending_collaboration'
- rejection_reason: Text (nullable)
- submitted_at: Timestamp
- updated_at: Timestamp
```

## Collaboration Workflow (Special Case)

For collaborative programs:

1. **Submission Created**: Admin submits program with collaborators
2. **Immediate Collaboration Requests**: Collaboration requests sent to invited organizations
3. **Superadmin Approval**: Superadmin approves → status becomes "approved_pending_collaboration"
4. **Collaborator Acceptance**: Collaborators accept/decline invitations
5. **Program Creation**: Program created only after all collaborators accept
6. **Notification**: All parties notified of program creation

**Code Location:**
- `backend/src/admin/controllers/programsController.js` - Collaboration request creation
- `backend/src/admin/controllers/collaborationController.js` - Collaboration acceptance

---

**Back to [Main Documentation](../PROJECT_DOCUMENTATION.md)**

