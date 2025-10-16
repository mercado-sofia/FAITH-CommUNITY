"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import Sidebar from "./components/Sidebar/Sidebar"
import TopBar from "./components/TopBar/TopBar"
import { Loader } from "@/components";
import styles from "./styles/layout.module.css"

function SuperAdminLayoutContent({ children }) {
  const router = useRouter();
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
  if (isInitialLoading) {
    return <Loader />;
  }

  return (
    <div className={styles.superAdminLayout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <TopBar />
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
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
