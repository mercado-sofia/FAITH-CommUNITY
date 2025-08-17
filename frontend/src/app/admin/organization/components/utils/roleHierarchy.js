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
 * Sort organization heads by role hierarchy (automatic ordering)
 * @param {Array} heads - Array of organization heads
 * @returns {Array} Sorted array
 */
export const sortHeadsByRoleHierarchy = (heads) => {
  return [...heads].sort((a, b) => {
    const roleA = a.role || '';
    const roleB = b.role || '';
    
    // Find the index of each role in the ROLE_OPTIONS array
    const indexA = ROLE_OPTIONS.findIndex(option => option.value === roleA);
    const indexB = ROLE_OPTIONS.findIndex(option => option.value === roleB);
    
    // If both roles are found in the hierarchy, sort by their index
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one role is found in the hierarchy, prioritize it
    if (indexA !== -1 && indexB === -1) {
      return -1; // roleA comes first
    }
    if (indexA === -1 && indexB !== -1) {
      return 1; // roleB comes first
    }
    
    // If neither role is in the hierarchy, sort alphabetically
    return roleA.localeCompare(roleB);
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

/**
 * Apply role hierarchy ordering to organization heads
 * This function automatically assigns display_order based on role hierarchy
 * @param {Array} heads - Array of organization heads
 * @returns {Array} Heads with updated display_order
 */
export const applyRoleHierarchyOrdering = (heads) => {
  // First, sort by role hierarchy
  const sortedHeads = sortHeadsByRoleHierarchy(heads);
  
  // Then assign display_order based on the sorted position
  return sortedHeads.map((head, index) => ({
    ...head,
    display_order: index + 1
  }));
};


