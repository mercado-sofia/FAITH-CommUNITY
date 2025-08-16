// Organization heads utility functions
// Role options with proper hierarchy
export const ROLE_OPTIONS = [
  { value: 'Org Adviser', label: 'Org Adviser' },
  { value: 'President', label: 'President' },
  { value: 'Vice President', label: 'Vice President' },
  { value: 'Secretary', label: 'Secretary' },
  { value: 'Assistant Secretary', label: 'Assistant Secretary' },
  { value: 'Treasurer', label: 'Treasurer' },
  { value: 'Assistant Treasurer', label: 'Assistant Treasurer' },
  { value: 'PRO', label: 'PRO' },
  { value: 'Class Representative', label: 'Class Representative' },
  { value: 'Others', label: 'Others' }
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
 * Get role badge color based on role hierarchy
 * @param {string} role - The role name
 * @returns {string} CSS class name for role badge
 */
export const getRoleBadgeColor = (role) => {
  const roleStr = role?.toLowerCase() || '';
  
  // Executive level roles (highest priority)
  if (roleStr.includes('adviser') || roleStr.includes('advisor') || roleStr.includes('president')) {
    return 'roleExecutive';
  }
  
  // Officer level roles (high priority)
  if (roleStr.includes('vice president') || roleStr.includes('secretary') || roleStr.includes('treasurer') || roleStr.includes('pro') || roleStr.includes('public relations')) {
    return 'roleOfficer';
  }
  
  // Assistant level roles (medium-high priority)
  if (roleStr.includes('assistant')) {
    return 'roleManager';
  }
  
  // Representative level roles (medium priority)
  if (roleStr.includes('representative')) {
    return 'roleCoordinator';
  }
  
  // Default for all other roles (lowest priority)
  return 'roleOther';
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


