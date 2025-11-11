"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import { Sidebar, superadminNavLinks, TopBar } from "@/components";
import { Loader, DynamicFavicon } from "@/components";
import { FiSmartphone } from 'react-icons/fi';
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
        
        const token = localStorage.getItem('superAdminToken');
        const superAdminData = localStorage.getItem('superAdminData');
        const userRole = typeof document !== 'undefined' ? document.cookie.includes('userRole=superadmin') : false;
        
        if (!token || !superAdminData || !userRole) {
          // Use centralized immediate cleanup for security
          clearAuthImmediate(USER_TYPES.SUPERADMIN);
          window.location.href = '/login';
          return;
        }

        // Validate token by making a test API call
        // This will catch hardcoded tokens that are rejected in production
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
          let superadminId = null;
          
          try {
            const parsedData = JSON.parse(superAdminData);
            superadminId = parsedData.id;
          } catch (e) {
            // Invalid JSON
            clearAuthImmediate(USER_TYPES.SUPERADMIN);
            window.location.href = '/login';
            return;
          }

          if (!superadminId) {
            clearAuthImmediate(USER_TYPES.SUPERADMIN);
            window.location.href = '/login';
            return;
          }

          const testResponse = await fetch(
            `${baseUrl}/api/superadmin/auth/profile/${superadminId}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          // If we get 401 or 403, token is invalid
          if (testResponse.status === 401 || testResponse.status === 403) {
            // Check if it's a hardcoded token rejection
            try {
              const errorData = await testResponse.json();
              if (errorData.error && errorData.error.includes('Hardcoded token not allowed in production')) {
                // Backend rejected hardcoded token - clear auth and redirect
                clearAuthImmediate(USER_TYPES.SUPERADMIN);
                window.location.href = '/login';
                return;
              }
            } catch (e) {
              // Can't parse error, treat as auth failure
            }
            clearAuthImmediate(USER_TYPES.SUPERADMIN);
            window.location.href = '/login';
            return;
          }

          // If response is not OK, token might be invalid
          if (!testResponse.ok) {
            clearAuthImmediate(USER_TYPES.SUPERADMIN);
            window.location.href = '/login';
            return;
          }
        } catch (apiError) {
          // Network error or other issue - allow through but log it
          console.warn('Token validation failed:', apiError);
          // Don't block access on network errors - let individual pages handle it
        }

        setIsInitialLoading(false);
      } catch (error) {
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
