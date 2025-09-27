'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import { NavigationProvider } from "../../contexts/NavigationContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import { ErrorBoundary, Loader } from "@/components";
import styles from "./dashboard/styles/dashboard.module.css";
import { Poppins, Inter, Urbanist } from 'next/font/google';
import logger from '../../utils/logger.js';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

const urbanist = Urbanist({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-urbanist',
});

// Track if admin has been initialized
let adminInitialized = false;

function AdminLayoutContent({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
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
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminData');
          document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = '/login';
          return;
        }

        // Initialize auth from localStorage (no parameters needed)
        dispatch(initializeAuth());
        
        adminInitialized = true;
        setIsInitialLoading(false);
      } catch (error) {
        logger.error('Error initializing admin', error, { context: 'admin_initialization' });
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/login';
      }
    };

    initializeAdmin();
  }, [dispatch, router]);

  // Show full-screen loader only on initial page load/reload
  if (isInitialLoading) {
    return <Loader />;
  }

  // For invitation acceptance page, render without admin layout components
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin/invitation/accept')) {
    return (
      <div className={`${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div className={`${styles.adminLayout} ${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
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