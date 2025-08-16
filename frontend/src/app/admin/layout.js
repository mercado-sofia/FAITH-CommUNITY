'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import { NavigationProvider } from "../../contexts/NavigationContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ErrorBoundary from "../../components/ErrorBoundary";
import Loader from "../../components/Loader";
import styles from "./dashboard/dashboard.module.css";
import scrollStyles from "./components/CustomScrollbar.module.css";
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

export default function AdminLayout({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isDashboardReady, setIsDashboardReady] = useState(false);

  useEffect(() => {
    dispatch(initializeAuth());

    const adminToken = localStorage.getItem("adminToken");
    const adminData = localStorage.getItem("adminData");
    const userRole = document.cookie.includes("userRole=admin");

    if (!adminToken || !adminData || !userRole) {
      router.push("/login");
    } else {
      setIsAuthChecked(true);
    }
  }, [dispatch, router]);

  // Listen for dashboard ready event
  useEffect(() => {
    const handleDashboardReady = () => {
      setIsDashboardReady(true);
    };

    // Check if we're on the dashboard page
    const isDashboardPage = window.location.pathname === '/admin' || window.location.pathname === '/admin/dashboard';
    
    if (isDashboardPage) {
      // Listen for dashboard ready event
      window.addEventListener('dashboardReady', handleDashboardReady);
      
      // Fallback: if no event is fired within 3 seconds, mark as ready
      const fallbackTimer = setTimeout(() => {
        setIsDashboardReady(true);
      }, 3000);
      
      return () => {
        window.removeEventListener('dashboardReady', handleDashboardReady);
        clearTimeout(fallbackTimer);
      };
    } else {
      // For non-dashboard pages, mark as ready immediately
      setIsDashboardReady(true);
    }
  }, []);

  // Show loader while auth is being checked or dashboard is loading
  if (!isAuthChecked || !isDashboardReady) {
    return (
      <div className={`${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
        <Loader />
      </div>
    );
  }

  return (
    <NavigationProvider>
      <div className={`${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
        <Sidebar />
        <TopBar />
        <main className={`${styles.mainContent} ${scrollStyles.adminScrollContainer} ${poppins.className}`}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </NavigationProvider>
  );
}