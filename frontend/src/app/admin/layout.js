'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import { Sidebar, adminNavLinks, TopBar } from "@/components";
import { ErrorBoundary, Loader, DynamicFavicon } from "@/components";
import { FiSmartphone } from 'react-icons/fi';
import styles from "./dashboard/styles/dashboard.module.css";
import logger from '../../utils/logger.js';

// Track if admin has been initialized
let adminInitialized = false;

// Mobile restriction component
function MobileRestrictionMessage({ portalName = "Admin" }) {
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

function AdminLayoutContent({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const adminError = useSelector(state => state.admin.error);
  const [isInitialLoading, setIsInitialLoading] = useState(!adminInitialized);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Check for mobile device
  useEffect(() => {
    setIsClient(true);
    const checkIsMobile = () => {
      // Consider devices with width <= 1024px as mobile/tablet
      // You can adjust this threshold if needed
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const initializeAdmin = async () => {
      // Skip initialization if already done
      if (adminInitialized) {
        setIsInitialLoading(false);
        return;
      }

      // Check if this is the invitation acceptance page - skip authentication
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/invitation/accept')) {
        setIsInitialLoading(false);
        return;
      }

      try {
        // Check for window to avoid SSR errors
        if (typeof window === 'undefined') {
          setIsInitialLoading(false);
          return;
        }
        
        const token = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        const userRole = typeof document !== 'undefined' ? document.cookie.includes('userRole=admin') : false;
        
        if (!token || !adminData || !userRole) {
          // Use centralized immediate cleanup for security
          clearAuthImmediate(USER_TYPES.ADMIN);
          window.location.href = '/login';
          return;
        }

        // Initialize auth from localStorage (no parameters needed)
        dispatch(initializeAuth());
        
        adminInitialized = true;
        setIsInitialLoading(false);
      } catch (error) {
        logger.error('Error initializing admin', error, { context: 'admin_initialization' });
        // Use centralized immediate cleanup for security
        clearAuthImmediate(USER_TYPES.ADMIN);
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    };

    initializeAdmin();
  }, [dispatch, router]);

  // Handle authentication errors from Redux
  useEffect(() => {
    if (adminError === "Invalid authentication data") {
      // Use centralized immediate cleanup for security
      clearAuthImmediate(USER_TYPES.ADMIN);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [adminError]);

  // Show full-screen loader only on initial page load/reload
  if (isInitialLoading || !isClient) {
    return <Loader />;
  }

  // For invitation acceptance page, allow access on mobile and render without admin layout components
  const isInvitationPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/invitation/accept');
  
  if (isInvitationPage) {
    return (
      <div>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    );
  }

  // Show mobile restriction message for mobile devices
  if (isMobile) {
    return <MobileRestrictionMessage portalName="Admin" />;
  }

  return (
    <>
      {/* Dynamic Favicon - optimized to prevent navigation delays */}
      <DynamicFavicon />
      <div className={styles.adminLayout}>
        <Sidebar 
          userType={USER_TYPES.ADMIN}
          basePath="/admin"
          navLinks={adminNavLinks}
        />
        <div className={styles.mainContent}>
          <TopBar 
            userType={USER_TYPES.ADMIN}
            basePath="/admin"
          />
          <main className={styles.content}>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </>
  );
}

export default function AdminLayout({ children }) {
  return (
    <NavigationProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </NavigationProvider>
  );
}