// Organization heads utility functions
// Simple role options without priority hierarchy
export const ROLE_OPTIONS = [
  { value: 'Org Adviser', label: 'Org Adviser' },
  { value: 'President', label: 'President' },
  { value: 'Vice President', label: 'Vice President' },
  { value: 'Secretary', label: 'Secretary' },
  { value: 'Treasurer', label: 'Treasurer' },
  { value: 'Director', label: 'Director' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Coordinator', label: 'Coordinator' },
  { value: 'Member', label: 'Member' },
  { value: 'Volunteer', label: 'Volunteer' },
  { value: 'Other', label: 'Other' }
];



/**
 * Sort organization heads by display order only (manual reordering)
 * @param {Array} heads - Array of organization heads
 * @returns {Array} Sorted array
 */
export const sortHeadsByOrder = (heads) => {
  return [...heads].sort((a, b) => {
    // Sort by display_order if available
    const orderA = a.display_order || 999;
    const orderB = b.display_order || 999;
    
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // If same order or no order, sort by name
    return (a.head_name || '').localeCompare(b.head_name || '');
  });
};

/**
 * Filter heads based on search query
 * @param {Array} heads - Array of organization heads
 * @param {string} searchQuery - Search query
 * @returns {Array} Filtered array
 */
export const filterHeads = (heads, searchQuery) => {
  if (!searchQuery || !searchQuery.trim()) {
    return heads;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return heads.filter(head => {
    const name = (head.head_name || '').toLowerCase();
    const role = (head.role || '').toLowerCase();
    const email = (head.email || '').toLowerCase();
    
    return name.includes(query) || 
           role.includes(query) || 
           email.includes(query);
  });
};

/**
 * Get role badge color (simplified - no priority-based colors)
 * @param {string} role - The role name
 * @returns {string} CSS class name for role badge
 */
export const getRoleBadgeColor = (role) => {
  // Simple color scheme without priority hierarchy
  const roleStr = role?.toLowerCase() || '';
  
  if (roleStr.includes('adviser') || roleStr.includes('advisor')) return 'gold';
  if (roleStr.includes('president')) return 'silver';
  if (roleStr.includes('secretary')) return 'blue';
  if (roleStr.includes('treasurer')) return 'green';
  return 'gray'; // Default for all other roles
};
