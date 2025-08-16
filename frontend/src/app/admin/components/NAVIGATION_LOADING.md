# Navigation Loading System

This document describes the navigation loading system implemented in the admin portal to provide visual feedback during page transitions.

## Overview

The navigation loading system provides multiple levels of loading feedback:

1. **Individual Link Loading**: Shows a spinner on the specific navigation link being clicked
2. **Global Navigation Loading**: Shows a progress bar at the top of the TopBar during any navigation
3. **Page-Level Loading**: Allows individual pages to set their own loading states

## Components

### 1. NavigationContext (`/contexts/NavigationContext.js`)

The central state management for navigation loading states.

**Features:**
- Tracks which link is currently loading
- Manages global navigation state
- Provides page-level loading state management
- Automatic cleanup when navigation completes

**Usage:**
```jsx
import { useNavigation } from '../../../contexts/NavigationContext';

const { handleNavigation, isLinkLoading, setPageLoading, isPageLoading } = useNavigation();
```

### 2. Sidebar Navigation Loading

Each navigation link in the sidebar shows:
- Loading spinner on the right side of the link
- Reduced opacity and disabled state
- Color change to indicate loading

**Visual States:**
- **Normal**: Default appearance
- **Loading**: Spinner + opacity reduction + color change
- **Active**: Current page highlighting

### 3. TopBar Global Loading Indicator

A thin progress bar that appears at the top of the TopBar during any navigation.

**Features:**
- Animated gradient bar
- Smooth slide animation
- Automatically disappears when navigation completes

## Implementation Details

### Navigation Detection

The system detects navigation completion by:
1. Monitoring `pathname` changes using `usePathname()`
2. Comparing current path with the loading path
3. Clearing loading state when they match

### Fallback Protection

- 5-second timeout to prevent infinite loading states
- Automatic cleanup on component unmount
- Error handling for edge cases

### Performance Considerations

- Minimal re-renders through efficient state management
- CSS animations for smooth visual feedback
- No blocking operations during navigation

## Usage Examples

### Basic Navigation Loading

```jsx
import { useNavigation } from '../../../contexts/NavigationContext';

function MyComponent() {
  const { handleNavigation, isLinkLoading } = useNavigation();
  
  return (
    <Link 
      href="/admin/dashboard"
      onClick={() => handleNavigation("/admin/dashboard")}
      className={isLinkLoading("/admin/dashboard") ? "loading" : ""}
    >
      Dashboard
      {isLinkLoading("/admin/dashboard") && <Spinner />}
    </Link>
  );
}
```

### Page-Level Loading

```jsx
import { useNavigation } from '../../../contexts/NavigationContext';

function DashboardPage() {
  const { setPageLoading, isPageLoading } = useNavigation();
  
  useEffect(() => {
    setPageLoading('/admin/dashboard', true);
    
    // Simulate data loading
    fetchData().finally(() => {
      setPageLoading('/admin/dashboard', false);
    });
  }, []);
  
  if (isPageLoading('/admin/dashboard')) {
    return <LoadingSpinner />;
  }
  
  return <DashboardContent />;
}
```

## CSS Classes

### Sidebar Loading States

- `.navItem.loading` - Applied to loading navigation items
- `.loadingSpinner` - The spinning indicator
- `.navItem.loading .icon` - Icon styling during loading

### TopBar Loading States

- `.navigationLoader` - Container for the progress bar
- `.loaderBar` - The animated progress bar element

## Customization

### Changing Loading Colors

Update the CSS variables in the respective module files:

```css
/* Sidebar loading colors */
.navItem.loading {
  color: #15e8c5; /* Custom loading color */
}

/* TopBar progress bar colors */
.loaderBar {
  background: linear-gradient(90deg, #your-color-1 0%, #your-color-2 100%);
}
```

### Adjusting Animation Speed

```css
/* Sidebar spinner speed */
.loadingSpinner {
  animation: spin 1s linear infinite; /* Adjust duration */
}

/* TopBar progress bar speed */
.loaderBar {
  animation: slideLoader 1.5s ease-in-out infinite; /* Adjust duration */
}
```

## Best Practices

1. **Always use the context**: Don't implement custom loading states that bypass the NavigationContext
2. **Set page loading states**: Use `setPageLoading` for data fetching operations
3. **Handle edge cases**: Always provide fallback timeouts
4. **Keep animations smooth**: Use CSS transforms for better performance
5. **Test on slow connections**: Ensure the system works well with slow network conditions

## Troubleshooting

### Loading State Not Clearing

1. Check if the pathname matches exactly
2. Verify the timeout is not too short
3. Ensure the NavigationProvider is wrapping the component

### Performance Issues

1. Reduce animation complexity
2. Use `transform` instead of `left/top` for animations
3. Consider reducing the frequency of state updates

### Visual Glitches

1. Check z-index values
2. Ensure proper positioning of loading indicators
3. Verify CSS specificity doesn't conflict
