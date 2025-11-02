"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import Sidebar from "./components/Sidebar/Sidebar"
import TopBar from "./components/TopBar/TopBar"
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
    const initializeSuperAdmin = async () => {
      try {
        const token = localStorage.getItem('superAdminToken');
        const superAdminData = localStorage.getItem('superAdminData');
        const userRole = document.cookie.includes('userRole=superadmin');
        
        if (!token || !superAdminData || !userRole) {
          // Use centralized immediate cleanup for security
          clearAuthImmediate(USER_TYPES.SUPERADMIN);
          window.location.href = '/login';
          return;
        }

        setIsInitialLoading(false);
      } catch (error) {
        // Use centralized immediate cleanup for security
        clearAuthImmediate(USER_TYPES.SUPERADMIN);
        window.location.href = '/login';
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
        <Sidebar />
        <div className={styles.mainContent}>
          <TopBar />
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
