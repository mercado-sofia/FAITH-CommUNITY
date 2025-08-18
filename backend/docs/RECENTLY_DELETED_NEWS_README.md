# Recently Deleted News Feature

## Overview

The Recently Deleted News feature provides a soft delete mechanism for news items, allowing administrators to recover accidentally deleted news within a 15-day window before permanent deletion.

## Database Changes

### New Columns Added to `news` Table

- `is_deleted` (BOOLEAN DEFAULT FALSE) - Flag to mark deleted items
- `deleted_at` (TIMESTAMP NULL) - Timestamp when the item was deleted

### Database Migration

The database migration is handled automatically in `database.js`. When the server starts, it checks if the new columns exist and adds them if missing.

## API Endpoints

### Admin Routes (Protected with Authentication)

#### Get Recently Deleted News
```
GET /api/admin/news/:orgId/deleted
```
Returns all deleted news items for the specified organization with days remaining until permanent deletion.

#### Restore Deleted News
```
POST /api/admin/news/:id/restore
```
Restores a deleted news item by setting `is_deleted = FALSE` and `deleted_at = NULL`.

#### Permanently Delete News
```
DELETE /api/admin/news/:id/permanent
```
Permanently deletes a news item from the database (hard delete).

#### Manual Cleanup
```
POST /api/admin/news/cleanup
```
Manually triggers cleanup of news items older than 15 days.

### Modified Endpoints

#### Delete News (Now Soft Delete)
```
DELETE /api/admin/news/:id
```
Now performs soft delete instead of hard delete.

#### Get News by Organization
```
GET /api/admin/news/:orgId
```
Now excludes deleted news items from the results.

## Frontend Components

### RecentlyDeletedModal
- Displays all recently deleted news items
- Shows days remaining until permanent deletion
- Provides restore and permanent delete actions
- Color-coded urgency indicators (red for ≤3 days, orange for ≤7 days, green for >7 days)

### Updated News Page
- Added "Recently Deleted" button in header
- Integrates with the modal for viewing deleted items
- Handles restore and permanent delete callbacks

## Automatic Cleanup

### Scheduled Cleanup
- Runs every 24 hours automatically
- Deletes news items that have been in deleted state for more than 15 days
- Logs cleanup results to console

### Manual Cleanup
- Can be triggered via API endpoint
- Useful for immediate cleanup or testing

## Features

### Soft Delete
- News items are marked as deleted instead of being removed from database
- Original data is preserved for potential recovery
- Deleted items are excluded from normal news queries

### Recovery Window
- 15-day recovery period before automatic permanent deletion
- Visual indicators show remaining days
- Color-coded urgency system

### Restore Functionality
- One-click restore for deleted news items
- Restored items return to normal news list
- Maintains original creation date and metadata

### Permanent Delete
- Manual option to permanently delete before 15-day window
- Confirmation dialog to prevent accidental permanent deletion
- Immediate removal from database

## Implementation Details

### Backend
- Modified `newsController.js` to support soft deletes
- Added new controller functions for recently deleted operations
- Created cleanup utility in `cleanupDeletedNews.js`
- Updated database queries to exclude deleted items

### Frontend
- Created `RecentlyDeletedModal.js` component
- Updated main news page with new button and modal integration
- Added responsive styling for mobile devices
- Implemented loading states and error handling

### Database
- Automatic migration handles column addition
- Indexes on `is_deleted` and `deleted_at` for performance
- Foreign key constraints maintained

## Usage

1. **Delete News**: Click the delete button on any news item
2. **View Recently Deleted**: Click "Recently Deleted" button in news page header
3. **Restore News**: Click "Restore" button on any deleted item
4. **Permanently Delete**: Click "Delete Permanently" for immediate removal
5. **Automatic Cleanup**: Happens every 24 hours automatically

## Error Handling

- Network errors are displayed to users
- Authentication failures redirect to login
- Database errors are logged and handled gracefully
- Confirmation dialogs prevent accidental actions

## Security

- All admin routes require authentication
- Organization-specific access control
- Input validation and sanitization
- SQL injection prevention through parameterized queries

## Performance Considerations

- Soft deletes maintain referential integrity
- Indexes on deletion fields for efficient queries
- Pagination support for large deleted item lists
- Efficient cleanup queries with date filtering
