# Collaboration Image Display Fix

## Issue Description

Programs with collaborators were showing no highlight images after the superadmin approved them and collaborators accepted the collaboration requests.

## Root Cause

The issue was in the collaboration workflow's image handling logic. When a program with collaborators is submitted and approved, the image data gets lost during the collaboration acceptance process due to improper handling of JSON-extracted strings.

### Technical Details

1. **Image Storage**: When a program is submitted with collaborators, the image is stored as base64 data in the `submissions.proposed_data` JSON field.

2. **JSON Extraction Issue**: The `JSON_EXTRACT` function in MySQL returns JSON-encoded strings, which include surrounding quotes. For example:
   - Original: `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...`
   - JSON_EXTRACT result: `"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."`

3. **Failed Upload Logic**: The collaboration acceptance logic checked `submissionData.image.startsWith('data:image/')`, but since the string started with a quote character, this check failed.

4. **Invalid Storage**: The quoted string was stored in the database, making it an invalid image URL.

## Solution

### 1. Created JSON Utility Functions

**File**: `backend/src/utils/jsonUtils.js`

```javascript
/**
 * Cleans a string that was extracted from JSON using JSON_EXTRACT
 * JSON_EXTRACT returns quoted strings, so we need to remove the surrounding quotes
 */
export const cleanJsonString = (jsonString) => {
  if (typeof jsonString === 'string' && jsonString.startsWith('"') && jsonString.endsWith('"')) {
    return jsonString.slice(1, -1); // Remove surrounding quotes
  }
  return jsonString;
};

/**
 * Cleans image data that was extracted from JSON
 */
export const cleanImageData = (imageData) => {
  return cleanJsonString(imageData);
};

/**
 * Checks if a string is a valid base64 image data URL
 */
export const isBase64Image = (str) => {
  const cleaned = cleanJsonString(str);
  return cleaned && cleaned.startsWith('data:image/');
};
```

### 2. Updated Collaboration Controller

**File**: `backend/src/admin/controllers/collaborationController.js`

- Updated the `acceptCollaborationRequest` function to properly clean JSON-extracted image data
- Added proper error handling and fallback logic
- Ensured images are uploaded to Cloudinary correctly

### 3. Updated Superadmin Approval Controller

**File**: `backend/src/superadmin/controllers/approvalController.js`

- Updated both `approveSubmission` and `bulkApproveSubmissions` functions
- Applied the same JSON string cleaning logic
- Ensured consistent image handling across all approval workflows

## Files Modified

1. `backend/src/utils/jsonUtils.js` - New utility file
2. `backend/src/admin/controllers/collaborationController.js` - Fixed collaboration acceptance
3. `backend/src/superadmin/controllers/approvalController.js` - Fixed approval workflows

## Testing

To test the fix:

1. Create a new program with collaborators and upload an image
2. Submit the program for approval
3. Have the superadmin approve the submission
4. Have collaborators accept the collaboration requests
5. Verify that the program displays with the correct highlight image

## Prevention

This fix prevents similar issues by:

1. **Centralized JSON Handling**: The utility functions provide consistent JSON string cleaning
2. **Proper Error Handling**: Fallback logic ensures images are handled even if Cloudinary upload fails
3. **Consistent Implementation**: All approval workflows now use the same image handling logic

## Impact

- ✅ Programs with collaborators now display highlight images correctly
- ✅ No breaking changes to existing functionality
- ✅ Improved error handling and fallback mechanisms
- ✅ Consistent image handling across all workflows
