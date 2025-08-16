# Admin Components

This directory contains reusable components for the admin section.

## DeleteConfirmationModal

A reusable confirmation modal for delete operations across all admin sections.

### Usage

```jsx
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

// In your component
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [itemToDelete, setItemToDelete] = useState(null);

const handleDelete = (item) => {
  setItemToDelete(item);
  setShowDeleteModal(true);
};

const handleConfirmDelete = async () => {
  // Your delete logic here
  await deleteItem(itemToDelete.id);
  setShowDeleteModal(false);
  setItemToDelete(null);
};

const handleCancelDelete = () => {
  setShowDeleteModal(false);
  setItemToDelete(null);
};

// In your JSX
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  itemName={itemToDelete?.name || 'this item'}
  itemType="program" // or "submission", "news", "organization head", etc.
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  isDeleting={false} // Set to true while deletion is in progress
/>
```

### Props

- `isOpen` (boolean): Controls modal visibility
- `itemName` (string): The name/title of the item being deleted (displayed in quotes)
- `itemType` (string): The type of item (e.g., "program", "submission", "news", "organization head")
- `onConfirm` (function): Callback when user confirms deletion
- `onCancel` (function): Callback when user cancels deletion
- `isDeleting` (boolean): Whether deletion is in progress (shows "Deleting..." text)

### Examples

**For Programs:**
```jsx
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  itemName={program?.title || 'this program'}
  itemType="program"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  isDeleting={isDeleting}
/>
```

**For Submissions:**
```jsx
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  itemName="this submission"
  itemType="submission"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  isDeleting={false}
/>
```

**For News:**
```jsx
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  itemName={news?.title || 'this news item'}
  itemType="news"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  isDeleting={false}
/>
```

**For Organization Heads:**
```jsx
<DeleteConfirmationModal
  isOpen={showDeleteModal}
  itemName={head?.head_name || 'this organization head'}
  itemType="organization head"
  onConfirm={handleConfirmDelete}
  onCancel={handleCancelDelete}
  isDeleting={saving}
/>
```

### Features

- **Dynamic Text**: The modal title and warning message automatically adapt based on the `itemType`
- **Consistent Styling**: Same visual design across all admin sections
- **Responsive**: Works on mobile and desktop
- **Accessibility**: Proper focus management and keyboard navigation
- **Loading States**: Shows "Deleting..." when `isDeleting` is true
- **Body Scroll Lock**: Prevents background scrolling when modal is open
