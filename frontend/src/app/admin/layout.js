'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import { NavigationProvider } from "../../contexts/NavigationContext";
import { clearAuthImmediate, USER_TYPES } from "../../utils/authService";
import Sidebar from "./components/Sidebar/Sidebar";
import TopBar from "./components/TopBar/TopBar";
import { ErrorBoundary, Loader } from "@/components";
import styles from "./dashboard/styles/dashboard.module.css";
import logger from '../../utils/logger.js';

// Track if admin has been initialized
let adminInitialized = false;

function AdminLayoutContent({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const adminError = useSelector(state => state.admin.error);
  const [isInitialLoading, setIsInitialLoading] = useState(!adminInitialized);

  useEffect(() => {
    const initializeAdmin = async () => {
      // Skip initialization if already done
      if (adminInitialized) {
        setIsInitialLoading(false);
        return;
      }

      // Check if this is the invitation acceptance page - skip authentication
      if (window.location.pathname.startsWith('/admin/invitation/accept')) {
        setIsInitialLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('adminToken');
        const adminData = localStorage.getItem('adminData');
        const userRole = document.cookie.includes('userRole=admin');
        
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
        window.location.href = '/login';
      }
    };

    initializeAdmin();
  }, [dispatch, router]);

  // Handle authentication errors from Redux
  useEffect(() => {
    if (adminError === "Invalid authentication data") {
      // Use centralized immediate cleanup for security
      clearAuthImmediate(USER_TYPES.ADMIN);
      window.location.href = '/login';
    }
  }, [adminError]);

  // Show full-screen loader only on initial page load/reload
  if (isInitialLoading) {
    return <Loader />;
  }

  // For invitation acceptance page, render without admin layout components
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/invitation/accept')) {
    return (
      <div>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className={styles.adminLayout}>
      <Sidebar />
      <div className={styles.mainContent}>
        <TopBar />
        <main className={styles.content}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
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