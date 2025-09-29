# Dynamic Logo Implementation

## Overview

The dynamic logo system allows the superadmin to upload and manage logos through the branding management interface, and these logos are automatically displayed across all authentication pages.

## Architecture

### Components

1. **`useDynamicLogo` Hook** (`/src/hooks/useDynamicLogo.js`)
   - Fetches branding data from the public API endpoint
   - Returns logo URL, logo name URL, favicon URL, loading state, and error state
   - Provides fallback to default logo if API fails

2. **`DynamicLogo` Component** (`/src/app/(auth)/components/DynamicLogo/`)
   - Reusable component for displaying dynamic logos
   - Handles loading states with spinner
   - Configurable width, height, alt text, and CSS classes
   - Uses Next.js Image component for optimization

### API Integration

- **Endpoint**: `/api/superadmin/branding/public`
- **Method**: GET
- **Authentication**: None (public endpoint)
- **Response**: 
  ```json
  {
    "success": true,
    "data": {
      "logo_url": "https://cloudinary.com/...",
      "name_url": "https://cloudinary.com/...",
      "favicon_url": "https://cloudinary.com/..."
    }
  }
  ```

## Implementation Details

### Auth Pages Updated

1. **Login Page** (`/src/app/(auth)/login/page.js`)
   - Uses `DynamicLogo` component in logo wrapper
   - Displays 80x80 logo above login form

2. **Signup Page** (`/src/app/(auth)/signup/page.js`)
   - Uses `DynamicLogo` component in logo wrapper
   - Displays 80x80 logo above signup form

3. **Reset Password Page** (`/src/app/(auth)/reset-password/page.js`)
   - Uses `DynamicLogo` component in logo wrapper
   - Displays 80x80 logo above reset form

### CSS Styling

- **Logo Wrapper**: `.logoWrapper` class with 2rem bottom margin
- **Loading State**: Spinner with brand color (#169c86)
- **Placeholder**: Light gray background with rounded corners

## Usage

### Basic Usage

```jsx
import { DynamicLogo } from '../components'

// Default 80x80 logo
<DynamicLogo />

// Custom size
<DynamicLogo width={100} height={100} />

// Custom alt text
<DynamicLogo alt="Company Logo" />

// Without loading state
<DynamicLogo showLoading={false} />
```

### Hook Usage

```jsx
import { useDynamicLogo } from '@/hooks/useDynamicLogo'

function MyComponent() {
  const { logoUrl, logoNameUrl, faviconUrl, isLoading, error } = useDynamicLogo()
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  
  return <img src={logoUrl} alt="Logo" />
}
```

## Benefits

1. **Centralized Management**: Superadmin can update logos from one place
2. **Automatic Updates**: Changes reflect immediately across all auth pages
3. **Fallback Support**: Default logo shown if API fails
4. **Loading States**: Smooth user experience with loading indicators
5. **Reusable**: Easy to add to new pages or components
6. **Performance**: Uses Next.js Image optimization

## Future Enhancements

1. **Caching**: Implement client-side caching for better performance
2. **Multiple Logo Types**: Support for different logo variants (light/dark themes)
3. **Logo Name Integration**: Use logo name URL for text-based branding
4. **Favicon Integration**: Automatically update page favicon
5. **Error Boundaries**: Better error handling and recovery

## Testing

To test the dynamic logo system:

1. Start both frontend and backend servers
2. Navigate to any auth page (login, signup, reset-password)
3. Verify logo loads from branding API
4. Upload new logo via superadmin branding interface
5. Refresh auth pages to see updated logo
6. Test fallback by stopping backend server
