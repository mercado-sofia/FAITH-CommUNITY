# Collaboration Workflow Implementation

## Overview

This document describes the implementation of the new collaboration workflow for program submissions. The workflow ensures that collaborative programs go through a proper approval process where collaborators must accept invitations before the program is created in the database.

## New Workflow

### Previous Workflow (Before Implementation)
1. User submits program with collaborators → goes to submissions table
2. Superadmin approves → creates program in programs_projects table AND sends collaboration requests
3. Collaborators accept/decline → program is already created

### New Workflow (After Implementation)
1. User submits program with collaborators → goes to submissions table
2. **Collaboration requests are sent immediately** to invited organizations
3. Superadmin approves → marks submission as "approved_pending_collaboration" (program NOT created yet)
4. Collaborators accept/decline → program is created only after acceptance
5. **Program is stored in programs_projects table only after all collaborators accept**

## Database Schema Changes

### 1. program_collaborations Table
```sql
-- Added new fields to support submission-based collaborations
ALTER TABLE program_collaborations 
ADD COLUMN submission_id INT NULL,
ADD COLUMN program_title VARCHAR(255) NULL,
ADD FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
ADD UNIQUE KEY unique_submission_collaborator (submission_id, collaborator_admin_id),
ADD INDEX idx_submission_status (submission_id, status);
```

### 2. submissions Table
```sql
-- Added new status for collaborative programs
ALTER TABLE submissions 
MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'approved_pending_collaboration') DEFAULT 'pending';
```

## Code Changes

### 1. Frontend Changes

#### ProgramForm Success Message
**File**: `frontend/src/app/admin/programs/hooks/useProgramsManagement.js`

Updated the success message to reflect the new workflow:
```javascript
message: `Your collaborative program "${programData.title}" has been submitted and collaboration requests have been sent to the invited organizations. The program will be sent to the superadmin for final approval only after collaborators accept the requests.`
```

### 2. Backend Changes

#### Submission Controller
**File**: `backend/src/admin/controllers/submissionController.js`

- Added logic to send collaboration requests immediately when a collaborative program is submitted
- Creates collaboration records linked to submission_id instead of program_id
- Sends notifications to collaborators immediately

#### Superadmin Approval Controller
**File**: `backend/src/superadmin/controllers/approvalController.js`

- Modified to NOT create programs immediately for collaborative submissions
- For collaborative programs: marks submission as "approved_pending_collaboration"
- For non-collaborative programs: creates program immediately as before
- Sends notifications to collaborators about superadmin approval

#### Collaboration Controller
**File**: `backend/src/admin/controllers/collaborationController.js`

- **acceptCollaborationRequest**: Completely rewritten to create programs only after all collaborators accept
- **declineCollaborationRequest**: Updated to work with submission-based workflow
- **getCollaborationRequests**: Updated to handle both submission-based and program-based collaborations

## API Endpoints

### Collaboration Requests
- `GET /api/collaborations/requests` - Get collaboration requests for current admin
- `POST /api/collaborations/:collaborationId/accept` - Accept collaboration request
- `POST /api/collaborations/:collaborationId/decline` - Decline collaboration request

### Program Submission
- `POST /api/submissions` - Submit program (now sends collaboration requests immediately)

### Superadmin Approval
- `POST /api/superadmin/approvals/:id/approve` - Approve submission (handles collaborative programs differently)

## Status Flow

### Submission Statuses
1. `pending` - Initial submission, collaboration requests sent
2. `approved_pending_collaboration` - Superadmin approved, waiting for collaborators
3. `approved` - All collaborators accepted, program created
4. `rejected` - Superadmin rejected or no collaborators accepted

### Collaboration Statuses
1. `pending` - Collaboration request sent, waiting for response
2. `accepted` - Collaborator accepted the request
3. `declined` - Collaborator declined the request

## User Experience

### For Program Creators
1. Submit program with collaborators
2. Receive confirmation that collaboration requests were sent
3. Wait for superadmin approval
4. Wait for collaborators to accept
5. Receive notification when program is created

### For Collaborators
1. Receive collaboration request notification immediately after submission
2. Receive notification when superadmin approves
3. Accept or decline the collaboration request
4. If accepted, program is created and becomes visible

### For Superadmins
1. See collaborative programs in approval queue
2. Approve collaborative programs (they remain pending until collaborators accept)
3. Approve non-collaborative programs (they are created immediately)

## Testing

### Test Script
Run the test script to verify database schema:
```bash
cd backend
node scripts/test_collaboration_workflow.js
```

### Manual Testing Steps
1. Create a program with collaborators
2. Verify collaboration requests are sent immediately
3. Approve the submission as superadmin
4. Accept collaboration requests as invited organizations
5. Verify program is created only after all collaborators accept

## Migration Notes

### For Existing Deployments
1. Run the database schema updates
2. Update existing collaboration records to work with new workflow
3. Test the workflow with existing data

### For New Deployments
1. The database schema is already updated in `database.js`
2. No migration needed for new installations

## Security Considerations

1. **No Bypass**: Programs cannot be created without proper collaboration approval
2. **Audit Trail**: All collaboration actions are logged and tracked
3. **Notification System**: All parties are notified of status changes
4. **Data Integrity**: Foreign key constraints ensure data consistency

## Error Handling

1. **Failed Notifications**: Collaboration workflow continues even if notifications fail
2. **Database Errors**: Proper rollback mechanisms for failed operations
3. **Invalid Data**: Validation at multiple levels (frontend, backend, database)

## Performance Considerations

1. **Efficient Queries**: Updated queries to handle both submission-based and program-based collaborations
2. **Indexing**: Added indexes for better query performance
3. **Caching**: Existing caching mechanisms remain in place

## Future Enhancements

1. **Bulk Operations**: Support for bulk collaboration management
2. **Advanced Notifications**: Email notifications for collaboration requests
3. **Collaboration Analytics**: Track collaboration success rates
4. **Auto-approval**: Optional auto-approval for trusted collaborators
