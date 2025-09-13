"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NavigationProvider } from "../../contexts/NavigationContext";
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import Loader from "../../components/Loader";
import styles from "./styles/layout.module.css"
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
  weight: ['400', '500', '600', '700'],
  variable: '--font-urbanist',
});

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
          localStorage.removeItem('superAdminToken');
          localStorage.removeItem('superAdminData');
          document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = '/login';
          return;
        }

        setIsInitialLoading(false);
      } catch (error) {
        console.error('Error initializing super admin:', error);
        localStorage.removeItem('superAdminToken');
        localStorage.removeItem('superAdminData');
        document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
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
    <div className={`${styles.superAdminLayout} ${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
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
