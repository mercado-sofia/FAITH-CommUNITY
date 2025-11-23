"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import { Sidebar, superadminNavLinks, TopBar } from "@/components";
import { Loader, DynamicFavicon } from "@/components";
import { FiSmartphone } from 'react-icons/fi';
import ToastContainer from "./components/ToastContainer";
import { useAcceptedInvitationsToast } from "./hooks/useAcceptedInvitationsToast";
import styles from "./styles/layout.module.css"

// Mobile restriction component
function MobileRestrictionMessage({ portalName = "Super Admin" }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      backgroundColor: '#ffffff'
    }}>
      <div style={{
        maxWidth: '400px',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '64px',
          height: '64px',
          marginBottom: '1.5rem',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: '#64748b'
        }}>
          <FiSmartphone size={28} />
        </div>
        <h1 style={{
          color: '#1e293b',
          marginBottom: '0.75rem',
          fontSize: '1.25rem',
          fontWeight: '600',
          letterSpacing: '-0.01em'
        }}>
          Not Available on Mobile
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '0.9375rem',
          lineHeight: '1.6',
          margin: 0
        }}>
          Please access the {portalName} portal from a desktop device.
        </p>
      </div>
    </div>
  );
}

function SuperAdminLayoutContent({ children }) {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Check for accepted invitations and show toast notifications
  useAcceptedInvitationsToast();

  // Check for mobile device
  useEffect(() => {
    setIsClient(true);
    if (typeof window === 'undefined') return;
    
    const checkIsMobile = () => {
      // Consider devices with width <= 1024px as mobile/tablet
      // You can adjust this threshold if needed
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth <= 1024);
      }
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', checkIsMobile);
      }
    };
  }, []);

  useEffect(() => {
    const initializeSuperAdmin = async () => {
      try {
        // Check for window to avoid SSR errors
        if (typeof window === 'undefined') {
          setIsInitialLoading(false);
          return;
        }
        
        console.log('[Superadmin Layout] Initializing...');
        console.log('[Superadmin Layout] Current cookies (visible):', document.cookie);
        console.log('[Superadmin Layout] Note: httpOnly cookies (access_token, refresh_token) are not visible in document.cookie');
        console.log('[Superadmin Layout] Check Application > Cookies in DevTools to see all cookies');
        
        // Check auth status from backend (reads from httpOnly cookie)
        // Add retry mechanism to handle race condition where cookies might not be immediately available
        const { getCurrentUser } = await import('@/utils/authService');
        const { getValidAccessToken } = await import('@/utils/tokenRefresh');
        let userData = null;
        let retryCount = 0;
        const maxRetries = 5; // Increased retries to handle token refresh
        const retryDelay = 500; // 500ms between retries
        
        while (retryCount < maxRetries && !userData) {
          try {
            // On first attempt, wait a bit to ensure cookies are available after redirect
            if (retryCount > 0) {
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            console.log(`[Superadmin Layout] Calling getCurrentUser (attempt ${retryCount + 1})...`);
            userData = await getCurrentUser();
            
            console.log(`[Superadmin Layout] Auth check attempt ${retryCount + 1}:`, { 
              hasUserData: !!userData, 
              role: userData?.role,
              userData: userData ? { id: userData.id, email: userData.email, role: userData.role } : null
            });
            
            // If no user data but we have retries left, try refreshing token
            if (!userData && retryCount < maxRetries - 1) {
              console.log('[Superadmin Layout] No user data, attempting token refresh...');
              const refreshed = await getValidAccessToken(true); // Force refresh
              if (refreshed) {
                console.log('[Superadmin Layout] Token refreshed, retrying auth check...');
                // Wait a bit for cookies to be set
                await new Promise(resolve => setTimeout(resolve, 200));
                continue; // Retry auth check
              } else {
                console.warn('[Superadmin Layout] Token refresh failed');
              }
            }
            
            if (userData && userData.role === 'superadmin') {
              break; // Success, exit retry loop
            }
            
            retryCount++;
          } catch (error) {
            console.error(`[Superadmin Layout] Auth check error (attempt ${retryCount + 1}):`, error);
            
            // Try token refresh on error if we have retries left
            if (retryCount < maxRetries - 1) {
              try {
                console.log('[Superadmin Layout] Error occurred, attempting token refresh...');
                const refreshed = await getValidAccessToken(true);
                if (refreshed) {
                  await new Promise(resolve => setTimeout(resolve, 200));
                  retryCount++;
                  continue; // Retry auth check
                }
              } catch (refreshError) {
                console.error('[Superadmin Layout] Token refresh error:', refreshError);
              }
            }
            
            retryCount++;
            
            // If it's the last retry and still failing, break
            if (retryCount >= maxRetries) {
              break;
            }
          }
        }
        
        // Final check after all retries
        if (!userData || userData.role !== 'superadmin') {
          console.warn('[Superadmin Layout] Auth check failed after retries - redirecting to login', {
            hasUserData: !!userData,
            role: userData?.role,
            expectedRole: 'superadmin',
            retryCount
          });
          clearAuthImmediate(USER_TYPES.SUPERADMIN);
          window.location.href = '/login';
          return;
        }

        // Store user data in localStorage for quick access (non-sensitive data only)
        localStorage.setItem('superAdminData', JSON.stringify(userData));

        // Set userRole cookie if not already set (for Next.js middleware in future)
        if (typeof document !== 'undefined' && !document.cookie.includes('userRole=superadmin')) {
          document.cookie = "userRole=superadmin; path=/; max-age=86400; SameSite=Lax";
        }
        
        console.log('[Superadmin Layout] Auth check successful, superadmin authenticated');
        
        setIsInitialLoading(false);
      } catch (error) {
        console.error('[Superadmin Layout] Initialization error:', error);
        // Use centralized immediate cleanup for security
        clearAuthImmediate(USER_TYPES.SUPERADMIN);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    };

    initializeSuperAdmin();
  }, [router]);

  // Show full-screen loader only on initial page load/reload
  if (isInitialLoading || !isClient) {
    return <Loader />;
  }

  // Show mobile restriction message for mobile devices
  if (isMobile) {
    return <MobileRestrictionMessage portalName="Super Admin" />;
  }

  return (
    <>
      {/* Dynamic Favicon - optimized to prevent navigation delays */}
      <DynamicFavicon />
      <ToastContainer />
      <div className={styles.superAdminLayout}>
        <Sidebar 
          userType={USER_TYPES.SUPERADMIN}
          basePath="/superadmin"
          navLinks={superadminNavLinks}
        />
        <div className={styles.mainContent}>
          <TopBar 
            userType={USER_TYPES.SUPERADMIN}
            basePath="/superadmin"
          />
          <main className={styles.content}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

export default function SuperAdminLayout({ children }) {
  return (
    <NavigationProvider>
      <SuperAdminLayoutContent>
        {children}
      </SuperAdminLayoutContent>
    </NavigationProvider>
  );
}
