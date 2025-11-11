'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '@/rtk/superadmin/adminSlice';
import { useAdminOrganization, useAdminSubmissions } from '@/app/admin/hooks/useAdminData';
import { useNavigation } from '@/contexts/NavigationContext';
import { makeAuthenticatedRequest } from '@/utils/adminAuth';
import { getBrandingImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths';
import { USER_TYPES } from '@/utils/authService';
import { useGetPendingApprovalsCountQuery } from '@/rtk/superadmin/dashboardApi';
import { useGetVolunteersByAdminOrgQuery } from '@/rtk/admin/volunteersApi';
import styles from './Sidebar.module.css';
import LogoutModalTrigger from './LogoutModalTrigger';

export default function Sidebar({ 
  userType = USER_TYPES.ADMIN,
  basePath = '/admin',
  navLinks = []
}) {
  const pathname = usePathname();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const { handleNavigation } = useNavigation();
  const [adminData, setAdminData] = useState(null);
  const [brandingData, setBrandingData] = useState(null);

  // Fetch pending approvals count for superadmin
  const { data: approvalsCountData = { total: 0 } } = useGetPendingApprovalsCountQuery(undefined, {
    skip: userType !== USER_TYPES.SUPERADMIN
  });
  const approvalsCount = approvalsCountData?.total || 0;

  // Fetch volunteers count for admin
  const { data: volunteersData = [] } = useGetVolunteersByAdminOrgQuery(currentAdmin?.id, {
    skip: userType !== USER_TYPES.ADMIN || !currentAdmin?.id
  });
  const volunteersCount = Array.isArray(volunteersData) ? volunteersData.length : 0;

  // Fetch pending submissions count for admin
  const orgAcronym = currentAdmin?.org;
  const { submissions = [] } = useAdminSubmissions(orgAcronym);
  const pendingSubmissionsCount = userType === USER_TYPES.ADMIN && Array.isArray(submissions)
    ? submissions.filter(submission => submission.status?.toLowerCase() === 'pending').length
    : 0;

  // Use SWR hook for organization data (only for admin)
  const { organization } = useAdminOrganization(
    userType === USER_TYPES.ADMIN ? currentAdmin?.organization_id : null
  );
  const orgLogo = organization?.logo || currentAdmin?.logo;
  const orgName = organization?.orgName || currentAdmin?.orgName || organization?.name || currentAdmin?.name;

  // Load user data based on userType
  useEffect(() => {
    if (userType === USER_TYPES.SUPERADMIN) {
      // Get superadmin data from localStorage
      const loadSuperAdminData = () => {
        try {
          const superAdminData = localStorage.getItem('superAdminData');
          if (superAdminData) {
            const parsedData = JSON.parse(superAdminData);
            setAdminData(parsedData);
          }
        } catch (error) {
          // Handle error silently in production
        }
      };
      
      // Load initially
      loadSuperAdminData();
      
      // Listen for storage changes (when email is updated in settings)
      const handleStorageChange = (e) => {
        if (e.key === 'superAdminData') {
          loadSuperAdminData();
        }
      };
      
      // Listen to storage events from other tabs/windows
      window.addEventListener('storage', handleStorageChange);
      
      // Also listen to custom storage events (for same-tab updates)
      window.addEventListener('superAdminDataUpdated', loadSuperAdminData);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('superAdminDataUpdated', loadSuperAdminData);
      };
    } else if (userType === USER_TYPES.ADMIN) {
      // Admin data comes from Redux store
      if (currentAdmin) {
        setAdminData(currentAdmin);
      }
    }
  }, [userType, currentAdmin]);

  // Load branding data (for both superadmin and admin)
  useEffect(() => {
    const loadBrandingData = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        
        if (userType === USER_TYPES.SUPERADMIN) {
          // Superadmin: try authenticated endpoint first, fallback to public
          let response = await makeAuthenticatedRequest(
            `${baseUrl}/api/superadmin/branding`,
            { method: 'GET' },
            'superadmin'
          );

          // If authenticated request fails, fallback to public endpoint
          if (!response || !response.ok) {
            response = await fetch(`${baseUrl}/api/superadmin/branding/public`);
          }

          if (response && response.ok) {
            const data = await response.json();
            // Both endpoints return { success: true, data: ... }
            if (data.success && data.data) {
              setBrandingData(data.data);
            }
          }
        } else if (userType === USER_TYPES.ADMIN) {
          // Admin: use public endpoint (branding is global)
          const response = await fetch(`${baseUrl}/api/superadmin/branding/public`);
          
          if (response && response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setBrandingData(data.data);
            }
          }
        }
      } catch (error) {
        // Handle error silently - branding is optional
        console.debug('Failed to load branding data:', error);
      }
    };

    loadBrandingData();
  }, [userType]);

  // Group nav links by section
  const groupedNavLinks = navLinks.reduce((acc, link) => {
    const section = link.section || 'general';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(link);
    return acc;
  }, {});

  // Check if pathname matches the link
  const isActive = (href) => {
    if (href === basePath || href === `${basePath}/dashboard`) {
      return pathname === basePath || pathname === `${basePath}/dashboard`;
    }
    return pathname.startsWith(href);
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userType === USER_TYPES.SUPERADMIN) {
      return {
        title: 'Superadmin',
        email: adminData?.email || adminData?.username || 'superadmin@faith.com',
        profileImage: '/defaults/default-profile.png'
      };
    } else {
      // For admin, use organization logo if available
      const profileImage = orgLogo 
        ? getOrganizationImageUrl(orgLogo, 'logo') 
        : '/defaults/default-profile.png';
      
      return {
        title: 'Admin',
        email: adminData?.email || currentAdmin?.email || '',
        profileImage: profileImage
      };
    }
  };

  const userInfo = getUserDisplayInfo();

  return (
    <aside className={styles.sidebar}>
      {/* Branding Section (Superadmin) */}
      {userType === USER_TYPES.SUPERADMIN && (brandingData?.logo_url || brandingData?.name_url) && (
        <div className={styles.brandingSection}>
          {brandingData?.logo_url && (
            <div className={styles.brandingLogo}>
              <Image
                src={getBrandingImageUrl(brandingData.logo_url, 'logo')}
                alt="Logo"
                width={34}
                height={34}
                unoptimized={true}
                onError={(e) => {
                  e.target.src = "/defaults/default-profile.png";
                }}
              />
            </div>
          )}
          {brandingData?.name_url && (
            <div className={styles.brandingTextLogo}>
              <Image
                src={getBrandingImageUrl(brandingData.name_url, 'name')}
                alt="Text Logo"
                width={130}
                height={32}
                unoptimized={true}
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Branding Section (Admin) */}
      {userType === USER_TYPES.ADMIN && (brandingData?.logo_url || brandingData?.name_url) && (
        <div className={styles.brandingSection}>
          {brandingData?.logo_url && (
            <div className={styles.brandingLogo}>
              <Image
                src={getBrandingImageUrl(brandingData.logo_url, 'logo')}
                alt="Logo"
                width={34}
                height={34}
                unoptimized={true}
                onError={(e) => {
                  e.target.src = "/defaults/default-profile.png";
                }}
              />
            </div>
          )}
          {brandingData?.name_url && (
            <div className={styles.brandingTextLogo}>
              <Image
                src={getBrandingImageUrl(brandingData.name_url, 'name')}
                alt="Text Logo"
                width={130}
                height={32}
                unoptimized={true}
                style={{ objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* User Info Section */}
      <div className={styles.adminInfo}>
        {userType === USER_TYPES.ADMIN && (
          <div className={styles.profileIconGradientBorder}>
            <div className={styles.profileIconInnerWhite}>
              <Image 
                src={userInfo.profileImage} 
                width={30} 
                height={30} 
                alt="Profile" 
                unoptimized={true}
                onError={(e) => {
                  e.target.src = "/defaults/default-profile.png";
                }}
              />
            </div>
          </div>
        )}
        <div className={styles.adminTextContent}>
          <div className={styles.adminHeading}>{userInfo.title}</div>
          <div className={styles.emailText}>
            {userInfo.email}
          </div>
        </div>
      </div>

      {/* Menu Wrapper */}
      <div className={styles.menuWrapper}>
        {Object.entries(groupedNavLinks).map(([section, links]) => (
          <div key={section}>
            <p className={styles.menuLabel} style={section === 'account' ? { marginTop: "0.2rem" } : {}}>
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </p>
            <nav className={styles.nav}>
              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                // Get count for Approvals link (superadmin)
                const showApprovalsCount = link.href === '/superadmin/approvals' && userType === USER_TYPES.SUPERADMIN;
                // Get count for Volunteers link (admin)
                const showVolunteersCount = link.href === '/admin/volunteers' && userType === USER_TYPES.ADMIN;
                // Get count for Submissions link (admin)
                const showSubmissionsCount = link.href === '/admin/submissions' && userType === USER_TYPES.ADMIN;
                const count = showApprovalsCount 
                  ? approvalsCount 
                  : (showVolunteersCount 
                    ? volunteersCount 
                    : (showSubmissionsCount 
                      ? pendingSubmissionsCount 
                      : null));
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`${styles.navBase} ${styles.navItem} ${active ? styles.active : ''}`}
                    onClick={() => {
                      if (handleNavigation && userType === USER_TYPES.ADMIN) {
                        handleNavigation(link.href);
                      }
                    }}
                    prefetch={userType === USER_TYPES.ADMIN}
                  >
                    {Icon && (
                      <Icon className={link.href === basePath || link.href === `${basePath}/dashboard` ? styles.dashbIcon : styles.icon} />
                    )}
                    <span className={styles.navLabel}>
                      {link.label}
                      {link.badge && <span className={styles.updateText}>{link.badge}</span>}
                    </span>
                    {count !== null && (
                      <span className={styles.navCount}>{count}</span>
                    )}
                  </Link>
                );
              })}
              {/* Add Logout button in Account section */}
              {section === 'account' && (
                <LogoutModalTrigger userType={userType} />
              )}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}

