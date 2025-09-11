# Centralized Page Loader System

## Overview

The Centralized Page Loader System provides a consistent, maintainable loading experience across all pages in the `(public)` portal. This system eliminates code duplication and ensures uniform loading behavior throughout the application.

## 🎯 Purpose

- **Consistency**: All public pages have identical loading behavior
- **Maintainability**: Single source of truth for loading logic
- **Performance**: Optimized loading timing for better UX
- **Portal Isolation**: Only affects `(public)` pages, admin portals remain untouched

## 📁 File Structure

```
frontend/src/app/(public)/
├── utils/
│   └── pageLoaderState.js          # Global state management
├── hooks/
│   └── usePublicPageLoader.js      # Custom hook for page loading
└── [all public pages]              # All pages use the centralized system
```

## 🔧 Core Components

### 1. State Management (`pageLoaderState.js`)

Manages global state for tracking visited pages within the `(public)` portal.

```javascript
// Global state variables
let hasVisitedPages = {};
let isFirstVisitPages = {};

// Key functions
getPageLoaderState(pageName)     // Get current state for a page
markPageAsVisited(pageName)      // Mark page as visited
resetAllPageStates()             // Reset all states (for testing)
getAllPageStates()               // Get all states (for debugging)
```

### 2. Custom Hook (`usePublicPageLoader.js`)

Provides a reusable hook for managing page loading states.

```javascript
const { loading, pageReady, isFirstVisit, hasVisited } = usePublicPageLoader('pageName', options);
```

**Parameters:**
- `pageName` (string): Unique identifier for the page
- `options` (object, optional):
  - `initialDelay`: Base loading delay in ms (default: 500)
  - `firstVisitExtraDelay`: Extra delay for first visits in ms (default: 1000)

**Returns:**
- `loading`: Boolean indicating if page is in initial loading state
- `pageReady`: Boolean indicating if page is ready to display
- `isFirstVisit`: Boolean indicating if this is the first visit to the page
- `hasVisited`: Boolean indicating if the page has been visited before

## 🚀 Usage

### Basic Implementation

```javascript
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';
import Loader from '../../../components/Loader';

export default function MyPage() {
  const { loading, pageReady } = usePublicPageLoader('my-page');
  
  if (loading || !pageReady) {
    return <Loader small centered />;
  }
  
  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### With Data Loading

```javascript
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';
import { usePublicData } from '../../../hooks/usePublicData';
import Loader from '../../../components/Loader';

export default function MyPage() {
  const { loading: pageLoading, pageReady } = usePublicPageLoader('my-page');
  const { data, isLoading: dataLoading, error } = usePublicData();
  
  if (pageLoading || !pageReady || dataLoading) {
    return <Loader small centered />;
  }
  
  if (error) {
    return <div>Error loading data</div>;
  }
  
  return (
    <div>
      {/* Page content with data */}
    </div>
  );
}
```

### Custom Timing

```javascript
const { loading, pageReady } = usePublicPageLoader('my-page', {
  initialDelay: 300,        // Faster initial loading
  firstVisitExtraDelay: 500 // Shorter first-visit delay
});
```

## ⏱️ Loading Timing

### Default Behavior
- **First Visit**: 500ms base delay + 1000ms extra delay = 1.5 seconds total
- **Subsequent Visits**: 500ms base delay only

### Timing Breakdown
1. **Initial Loading** (500ms): Base delay for all visits
2. **First Visit Extra** (1000ms): Additional delay only for first-time visitors
3. **Page Ready**: Content becomes visible after all delays complete

## 📋 Implemented Pages

All major public pages now use the centralized loading system:

- ✅ **Home** (`/`) - `usePublicPageLoader('home')`
- ✅ **About** (`/about`) - `usePublicPageLoader('about')`
- ✅ **Profile** (`/profile`) - `usePublicPageLoader('profile')`
- ✅ **Programs** (`/programs`) - `usePublicPageLoader('programs')`
- ✅ **Program Details** (`/programs/[slug]`) - `usePublicPageLoader('program-${slug}')`
- ✅ **Organization** (`/programs/org/[orgID]`) - `usePublicPageLoader('org-${orgID}')`
- ✅ **FAQs** (`/faqs`) - `usePublicPageLoader('faqs')`
- ✅ **News** (`/news`) - `usePublicPageLoader('news')`
- ✅ **News Detail** (`/news/[slug]`) - `usePublicPageLoader('news-${slug}')`
- ✅ **Apply** (`/apply`) - `usePublicPageLoader('apply')`

## 🔄 Migration Process

### Before (Old Pattern)
```javascript
// Each page had 50+ lines of duplicate code
let hasVisitedPage = false;
let isFirstVisitPage = true;

export default function MyPage() {
  const [loading, setLoading] = useState(!hasVisitedPage);
  const [pageReady, setPageReady] = useState(false);
  const timerRef = useRef(null);
  const pageReadyTimerRef = useRef(null);
  
  useEffect(() => {
    if (!hasVisitedPage && typeof window !== 'undefined') {
      hasVisitedPage = true;
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, 500);
    } else {
      setLoading(false);
    }
    return () => clearTimeout(timerRef.current);
  }, []);
  
  useEffect(() => {
    if (!loading) {
      const extraDelay = isFirstVisitPage ? 1000 : 0;
      pageReadyTimerRef.current = setTimeout(() => {
        setPageReady(true);
        isFirstVisitPage = false;
      }, extraDelay);
    }
    return () => {
      if (pageReadyTimerRef.current) {
        clearTimeout(pageReadyTimerRef.current);
      }
    };
  }, [loading]);
  
  if (loading || !pageReady) {
    return <Loader small centered />;
  }
  
  // ... rest of component
}
```

### After (New Pattern)
```javascript
// Clean, simple implementation
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';

export default function MyPage() {
  const { loading, pageReady } = usePublicPageLoader('my-page');
  
  if (loading || !pageReady) {
    return <Loader small centered />;
  }
  
  // ... rest of component
}
```

## 🎨 Benefits Achieved

### Code Quality
- **DRY Principle**: Eliminated 50+ lines of duplicate code per page
- **Maintainability**: Single source of truth for loading behavior
- **Consistency**: All pages behave identically
- **Readability**: Clean, simple implementation

### User Experience
- **Smooth Loading**: Professional loading animation
- **Consistent Timing**: Predictable loading behavior
- **Performance**: Optimized for first-time vs returning visitors
- **Visual Feedback**: Clear loading states

### Developer Experience
- **Easy Implementation**: One line to add loading to any page
- **Flexible Configuration**: Customizable timing options
- **Debug Support**: Utility functions for state inspection
- **Future-Proof**: Easy to extend and modify

## 🛠️ Advanced Usage

### Debugging
```javascript
import { getAllPageStates } from '../utils/pageLoaderState';

// Get all page states for debugging
const states = getAllPageStates();
console.log('All page states:', states);
```

### Testing
```javascript
import { resetAllPageStates } from '../utils/pageLoaderState';

// Reset all states before tests
beforeEach(() => {
  resetAllPageStates();
});
```

### Custom Page Names
```javascript
// Use descriptive, unique page names
usePublicPageLoader('program-details-bootcamp-2024')
usePublicPageLoader('news-article-community-update')
usePublicPageLoader('org-page-student-council')
```

## 🔮 Future Enhancements

The centralized system makes it easy to add features like:

- **Analytics Integration**: Track page visit patterns
- **Performance Monitoring**: Measure loading times
- **A/B Testing**: Different loading behaviors
- **Custom Loaders**: Different loader types per page
- **Progressive Loading**: Staged content loading

## 📝 Best Practices

1. **Use Descriptive Page Names**: Make page names unique and descriptive
2. **Combine with Data Loading**: Always consider data loading alongside page loading
3. **Handle Errors Gracefully**: Show appropriate error states
4. **Test Loading States**: Verify loading behavior in different scenarios
5. **Monitor Performance**: Keep loading times reasonable

## 🚨 Important Notes

- **Portal Isolation**: This system only affects `(public)` pages
- **Admin Portals**: Admin and superadmin portals remain unchanged
- **Browser Compatibility**: Uses modern JavaScript features
- **Memory Management**: Properly cleans up timers and event listeners
- **SSR Compatibility**: Handles server-side rendering correctly

## 📊 Impact Summary

- **Code Reduction**: ~500+ lines of duplicate code eliminated
- **Files Modified**: 10+ page files refactored
- **New Files**: 2 new utility files created
- **Consistency**: 100% of public pages now use centralized loading
- **Maintainability**: Single point of control for all loading behavior

---

*This documentation reflects the current implementation as of the latest refactoring. For updates or modifications, please update this document accordingly.*
