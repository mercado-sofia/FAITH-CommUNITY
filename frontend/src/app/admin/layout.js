'use client';

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useDispatch } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import { NavigationProvider } from "../../contexts/NavigationContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ErrorBoundary from "../../components/ErrorBoundary";
import Loader from "../../components/Loader";
import styles from "./dashboard/dashboard.module.css";
import { Poppins, Inter, Urbanist } from 'next/font/google';

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
  const pathname = usePathname();
  const [isInitialLoading, setIsInitialLoading] = useState(!adminInitialized);

  useEffect(() => {
    const initializeAdmin = async () => {
      // Skip initialization if already done
      if (adminInitialized) {
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
          router.push('/login');
          return;
        }

        const parsedAdminData = JSON.parse(adminData);
        dispatch(initializeAuth({ token, adminData: parsedAdminData }));
        
        adminInitialized = true;
        setIsInitialLoading(false);
      } catch (error) {
        console.error('Error initializing admin:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        router.push('/login');
      }
    };

    initializeAdmin();
  }, [dispatch, router]);

  // Show full-screen loader only on initial page load/reload
  if (isInitialLoading) {
    return <Loader />;
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