// Breadcrumb configuration for admin and superadmin portals

// Admin breadcrumb mapping
export const adminBreadcrumbConfig = {
  dashboard: { category: 'General', section: 'Dashboard' },
  volunteers: { category: 'Management', section: 'Volunteers' },
  organization: { category: 'Management', section: 'Organization' },
  programs: { category: 'Management', section: 'Programs' },
  highlights: { category: 'Management', section: 'Highlights' },
  news: { category: 'Management', section: 'News' },
  submissions: { category: 'Management', section: 'Submissions' },
  inbox: { category: 'General', section: 'Inbox' },
  settings: { category: 'Account', section: 'Settings' },
};

// Superadmin breadcrumb mapping
export const superadminBreadcrumbConfig = {
  dashboard: { category: 'General', section: 'Dashboard' },
  approvals: { category: 'Management', section: 'Approvals' },
  programs: { category: 'Management', section: 'Programs' },
  highlights: { category: 'Management', section: 'Highlights' },
  faqs: { category: 'Management', section: 'FAQs' },
  invites: { category: 'Management', section: 'Invites' },
  settings: { category: 'Account', section: 'Settings' },
};

// Helper function to get breadcrumb parts
export const getBreadcrumbParts = (pathname, basePath, config) => {
  const pathSegments = pathname.split('/').filter(segment => segment !== '');
  const baseSegment = basePath.replace('/', '');
  
  if (pathSegments.length <= 1 || pathSegments[0] !== baseSegment) {
    return { category: 'General', section: 'Dashboard' };
  }

  const section = pathSegments[1] || 'dashboard';
  return config[section] || { category: 'General', section: 'Dashboard' };
};

