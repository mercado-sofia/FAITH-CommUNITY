# Collaboration Notification Fix

## Issue Description

When creating a new program with collaborators, the program was successfully submitted to superadmin and approved, but:
1. The program was not showing in the interface of added collaborators
2. No notifications were sent to collaborators about the collaboration request
3. Collaborators could not see the program to accept or decline it

## Root Cause Analysis

The issue was in the collaboration workflow implementation:

### Problem 1: Incomplete Collaboration Request Linking
- When a program submission was approved, collaboration requests were created with `submission_id` but not properly linked to the new `program_id`
- The `getCollaborationRequests` function was looking for programs in the `programs_projects` table, but collaboration records were still linked to `submission_id`

### Problem 2: Missing Notifications
- After program approval, notifications were not being sent to collaborators about the new collaboration request
- The notification system was only triggered during submission, not during approval

### Problem 3: Query Logic Issues
- The collaboration requests query was not properly handling the relationship between submissions and approved programs
- Missing collaboration_id and collaboration_status in the main query

## Fixes Implemented

### 1. Enhanced Program Approval Process (`approvalController.js`)

#### Individual Approval (`approveSubmission`)
```javascript
// Update existing collaboration requests to link to the new program
const [updateResult] = await connection.execute(`
  UPDATE program_collaborations 
  SET program_id = ?, status = 'pending', program_title = ?
  WHERE submission_id = ? AND program_id IS NULL
`, [programId, data.title, id]);

// Send notifications to collaborators about the approved program
if (updateResult.affectedRows > 0) {
  // Get the updated collaboration records
  const [updatedCollaborations] = await connection.execute(`
    SELECT collaborator_admin_id FROM program_collaborations 
    WHERE program_id = ? AND status = 'pending'
  `, [programId]);
  
  // Send notifications to each collaborator
  for (const collab of updatedCollaborations) {
    try {
      await NotificationController.createNotification(
        collab.collaborator_admin_id,
        'collaboration_request',
        'New Collaboration Request',
        `You have received a collaboration request for "${data.title}". Please review and respond in the Collaboration section.`,
        'programs',
        programId
      );
    } catch (notificationError) {
      console.error('Failed to send collaboration request notification:', notificationError);
    }
  }
}
```

#### Bulk Approval (`bulkApproveSubmissions`)
- Enhanced to handle both updating existing collaboration requests and creating new ones
- Ensures notifications are sent for all collaboration requests
- Properly links collaboration requests to approved programs

### 2. Improved Collaboration Requests Query (`collaborationController.js`)

#### Enhanced Query
```javascript
const [allCollaborations] = await db.execute(`
  SELECT DISTINCT
    COALESCE(p.id, pc.submission_id) as program_id,
    COALESCE(p.title, pc.program_title) as program_title,
    // ... other fields ...
    pc.id as collaboration_id,
    pc.status as collaboration_status
  FROM program_collaborations pc
  LEFT JOIN programs_projects p ON pc.program_id = p.id
  LEFT JOIN submissions s ON pc.submission_id = s.id
  LEFT JOIN organizations prog_org ON COALESCE(p.organization_id, s.organization_id) = prog_org.id
  WHERE (
    pc.collaborator_admin_id = ? 
    OR pc.invited_by_admin_id = ?
    OR COALESCE(p.organization_id, s.organization_id) = ?
  )
  AND pc.status IN ('pending', 'accepted', 'declined')
  ORDER BY COALESCE(p.created_at, s.submitted_at) DESC
`, [currentAdminId, currentAdminId, adminOrgId]);
```

#### Improved Data Processing
- Added `collaboration_id` and `collaboration_status` to the main query
- Enhanced processing logic to use collaboration data from the main query
- Better handling of collaboration request types (sent vs received)

### 3. Debug and Utility Tools

#### Debug Endpoint (`/api/collaborations/debug`)
- Provides comprehensive collaboration data for troubleshooting
- Shows collaboration requests, notifications, and summary statistics
- Helps identify orphaned collaboration requests and missing notifications

#### Data Fix Script (`scripts/fixCollaborationData.js`)
- Automatically fixes orphaned collaboration requests
- Links collaboration requests to their corresponding programs
- Sends missing notifications
- Updates program collaboration status

## Testing the Fix

### 1. Test the Debug Endpoint
```bash
GET /api/collaborations/debug
Authorization: Bearer <admin_token>
```

This will show:
- All collaboration requests for the admin
- Notification history
- Summary statistics including orphaned collaborations

### 2. Test the Data Fix Script
```bash
cd backend
node scripts/fixCollaborationData.js
```

This will:
- Find and fix orphaned collaboration requests
- Send missing notifications
- Update program collaboration status

### 3. Test the Complete Workflow
1. Create a new program with collaborators
2. Submit for approval
3. Approve as superadmin
4. Check that collaborators receive notifications
5. Verify collaborators can see the program in their interface
6. Test accept/decline functionality

## Expected Behavior After Fix

1. ✅ **Program Creation**: Admin creates program with collaborators → submission created
2. ✅ **Superadmin Approval**: Superadmin approves → program created in `programs_projects` table
3. ✅ **Collaboration Linking**: Collaboration requests are properly linked to the new program
4. ✅ **Notifications Sent**: Collaborators receive notifications about the collaboration request
5. ✅ **Interface Visibility**: Collaborators can see the program in their collaboration interface
6. ✅ **Accept/Decline**: Collaborators can accept or decline the collaboration request

## Database Schema Requirements

The fix requires the following database schema:

```sql
-- program_collaborations table
CREATE TABLE program_collaborations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  program_id INT NULL,
  submission_id INT NULL,
  collaborator_admin_id INT NOT NULL,
  invited_by_admin_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined') DEFAULT 'pending',
  program_title VARCHAR(255) NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (program_id) REFERENCES programs_projects(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (collaborator_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by_admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  UNIQUE KEY unique_program_collaborator (program_id, collaborator_admin_id),
  UNIQUE KEY unique_submission_collaborator (submission_id, collaborator_admin_id),
  INDEX idx_collaborator_status (collaborator_admin_id, status),
  INDEX idx_program_status (program_id, status),
  INDEX idx_submission_status (submission_id, status)
);

-- admin_notifications table
CREATE TABLE admin_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  section VARCHAR(50) NULL,
  submission_id INT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);
```

## Monitoring and Maintenance

### Regular Checks
1. Monitor the debug endpoint for orphaned collaboration requests
2. Check notification delivery rates
3. Verify collaboration request visibility in admin interfaces

### Maintenance Tasks
1. Run the data fix script periodically to clean up any inconsistencies
2. Monitor database performance for collaboration-related queries
3. Review collaboration workflow logs for any errors

## Rollback Plan

If issues arise, the following rollback steps can be taken:

1. **Revert Code Changes**: Restore previous versions of the modified files
2. **Database Rollback**: Use the data fix script to identify and revert any data changes
3. **Notification Cleanup**: Remove any duplicate notifications created during the fix

## Future Improvements

1. **Real-time Notifications**: Implement WebSocket-based real-time notifications
2. **Email Notifications**: Add email notifications for collaboration requests
3. **Collaboration Analytics**: Track collaboration acceptance rates and patterns
4. **Automated Testing**: Add automated tests for the collaboration workflow
5. **Performance Optimization**: Optimize database queries for large-scale collaboration data
