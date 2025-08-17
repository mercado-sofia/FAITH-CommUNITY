# Inbox Functionality Implementation

## Overview
This implementation adds a complete inbox system that connects the public portal's Floating Message component with the admin portal, allowing general users to send messages to specific organizations and admins to view and manage those messages.

## Database Changes

### New Table: `messages`
```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organization_id INT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_name VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  INDEX idx_organization_read (organization_id, is_read),
  INDEX idx_created_at (created_at)
);
```

## Backend Implementation

### Public API (for message submission)
- **Controller**: `backend/back_end/for_public/controllers/messagesController.js`
- **Route**: `POST /api/messages`
- **Functionality**: Handles message submission from public portal

### Admin API (for inbox management)
- **Controller**: `backend/back_end/admin/controllers/inboxController.js`
- **Routes**:
  - `GET /api/inbox/:organization_id` - Get messages for organization
  - `GET /api/inbox/:organization_id/unread-count` - Get unread count
  - `PATCH /api/inbox/:message_id/read` - Mark message as read
  - `PATCH /api/inbox/:organization_id/mark-all-read` - Mark all as read
  - `DELETE /api/inbox/:message_id` - Delete message

## Frontend Implementation

### Public Portal
- **Component**: `frontend/src/app/(public)/components/FloatingMessage.js`
- **API**: `frontend/src/rtk/(public)/messagesApi.js`
- **Functionality**: 
  - Organization selection dropdown
  - Email validation
  - Message submission to backend
  - Success/error handling

### Admin Portal
- **Page**: `frontend/src/app/admin/inbox/page.js`
- **API**: `frontend/src/rtk/admin/inboxApi.js`
- **Features**:
  - View all messages for the admin's organization
  - Filter by unread messages
  - Mark individual messages as read
  - Mark all messages as read
  - Delete messages
  - Pagination support
  - Unread count badge in top bar

### Top Bar Integration
- **Component**: `frontend/src/app/admin/components/TopBar.js`
- **Features**:
  - Inbox icon with unread count badge
  - Direct navigation to inbox page

## Key Features

### Security & Privacy
- Admins can only see messages sent to their organization
- Organization isolation through database foreign keys
- Input validation and sanitization

### User Experience
- Real-time unread count updates
- Intuitive message management interface
- Responsive design for mobile devices
- Loading states and error handling

### Message Management
- Read/unread status tracking
- Bulk operations (mark all as read)
- Message deletion with confirmation
- Pagination for large message lists

## Usage Flow

1. **Public User**:
   - Clicks floating message button on public portal
   - Selects organization from dropdown
   - Enters email and message
   - Submits message (stored in database)

2. **Admin**:
   - Sees unread count badge in top bar
   - Clicks inbox icon to view messages
   - Can filter, mark as read, or delete messages
   - Messages are automatically filtered by their organization

## Technical Notes

- Uses RTK Query for API state management
- Implements proper error handling and loading states
- Follows existing code patterns and styling
- Database indexes for optimal query performance
- Foreign key constraints for data integrity

## Testing

To test the implementation:

1. Start the backend server
2. Navigate to the public portal
3. Use the floating message component to send a message
4. Log in as an admin of the selected organization
5. Check the inbox for the received message
6. Test all inbox management features

## Future Enhancements

- Email notifications for new messages
- Message threading/replies
- File attachments
- Message templates
- Advanced filtering and search
- Message export functionality
