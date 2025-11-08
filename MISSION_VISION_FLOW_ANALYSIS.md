# Mission & Vision Flow Analysis

## Overview
This document analyzes the complete flow of the Mission & Vision management feature, from user input to database storage.

## Database Schema

**Table: `mission_vision`**
- `id` (INT, AUTO_INCREMENT, PRIMARY KEY)
- `type` (ENUM: 'mission', 'vision', NOT NULL)
- `content` (TEXT, NULL) - **Updated to allow NULL for empty fields**
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)
- Indexes: `idx_type`

## Frontend Flow (`MissionVisionManagement.js`)

### 1. **Data Loading (on mount)**
- **Endpoint**: `GET /api/mission-vision`
- **Method**: `makeAuthenticatedRequest` with 'superadmin' role
- **Process**:
  - Fetches all mission/vision entries
  - Extracts Mission and Vision items from response
  - Sets state: `mission`, `vision`, `tempMission`, `tempVision`
  - Displays in view mode (non-editable)

### 2. **Edit Mode Toggle**
- **Action**: Click "Edit" button
- **Process**:
  - Sets `isEditing = true`
  - Copies current values to temp state (`tempMission`, `tempVision`)
  - Switches display from `<div>` to `<textarea>` for editing

### 3. **Save Changes**
- **Action**: Click "Save Changes" button
- **Process**:
  1. Normalizes values (trims whitespace, handles empty strings)
  2. Compares temp values with current values
  3. For each changed field (Mission/Vision):
     - Sends `POST /api/mission-vision` with:
       - `type`: 'Mission' or 'Vision'
       - `content`: normalized value (null if empty string)
  4. Reloads data from server after save
  5. Updates state with fresh data
  6. Shows success/error message
  7. Exits edit mode

### 4. **Cancel Edit**
- **Action**: Click "Cancel" button
- **Process**:
  - Resets temp values to original values
  - Sets `isEditing = false`
  - Returns to view mode

## Backend Flow (`missionVisionController.js`)

### 1. **GET `/api/mission-vision`** (Public)
- **Controller**: `getMissionVision`
- **Process**:
  - Queries database for latest Mission and Vision entries
  - Returns array with capitalized types ('Mission', 'Vision')
  - Returns empty array if no entries exist

### 2. **POST `/api/mission-vision`** (Protected - Superadmin/Admin)
- **Controller**: `upsertMissionVision`
- **Process**:
  1. Validates type ('Mission' or 'Vision')
  2. Normalizes type to lowercase for database
  3. Checks if entry exists for this type
  4. **UPSERT Logic**:
     - **If exists**: Updates existing entry's content
     - **If not exists**: Inserts new entry with type and content
  5. Returns success response with updated/created data

### 3. **PUT `/api/mission-vision/:id`** (Protected)
- **Controller**: `updateMissionVision`
- **Note**: Not used by frontend (frontend uses POST with UPSERT)

### 4. **DELETE `/api/mission-vision/:id`** (Protected)
- **Controller**: `deleteMissionVision`
- **Process**: Permanently deletes the entry from database

## Data Flow Diagram

```
User Input (Textarea)
    ↓
Frontend State (tempMission/tempVision)
    ↓
Normalize (trim, empty → null)
    ↓
POST /api/mission-vision
    ↓
Backend Validation
    ↓
Database Query (Check if exists)
    ↓
UPSERT (Update or Insert)
    ↓
Database (mission_vision table)
    ↓
Response (Success/Error)
    ↓
Frontend Reload Data
    ↓
Update Display
```

## Key Features

1. **UPSERT Pattern**: Ensures only one Mission and one Vision entry exist
2. **Empty Field Handling**: Empty strings are converted to NULL in database
3. **Type Normalization**: Frontend uses 'Mission'/'Vision', database uses 'mission'/'vision'
4. **Real-time Updates**: Data is reloaded after save to ensure consistency
5. **Error Handling**: Comprehensive error handling for network, CORS, and validation errors

## Fixed Issues

### ✅ Database Schema Update
- **Issue**: Schema had `content TEXT NOT NULL` but controller allowed NULL
- **Fix**: Updated schema to `content TEXT NULL` and added migration
- **Location**: `backend/src/database.js` lines 1373, 1383-1387

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/mission-vision` | Public | Get latest Mission and Vision |
| POST | `/api/mission-vision` | Superadmin/Admin | UPSERT Mission or Vision |
| PUT | `/api/mission-vision/:id` | Superadmin/Admin | Update by ID (not used) |
| DELETE | `/api/mission-vision/:id` | Superadmin/Admin | Soft delete (set INACTIVE) |

## State Management

### Frontend State Variables
- `missionVisionData`: Array of all entries
- `mission`: Current mission content (view mode)
- `vision`: Current vision content (view mode)
- `tempMission`: Temporary mission content (edit mode)
- `tempVision`: Temporary vision content (edit mode)
- `isEditing`: Boolean for edit mode toggle
- `isUpdating`: Boolean for save operation loading state

## Error Handling

### Frontend
- Network errors (connection issues)
- CORS errors (backend URL issues)
- Authentication errors (401 responses)
- Validation errors (from backend)

### Backend
- Type validation (must be 'Mission' or 'Vision')
- Database errors (connection, query failures)
- Missing data errors (failed to fetch after operation)

## Testing Checklist

- [ ] Load mission/vision data on mount
- [ ] Toggle edit mode (Edit button)
- [ ] Edit mission statement and save
- [ ] Edit vision statement and save
- [ ] Edit both and save together
- [ ] Cancel edit (should reset changes)
- [ ] Save empty mission (should allow NULL)
- [ ] Save empty vision (should allow NULL)
- [ ] Error handling (network, CORS, auth)
- [ ] Data persistence after page reload

