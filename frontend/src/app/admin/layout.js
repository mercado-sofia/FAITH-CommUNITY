'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { initializeAuth } from "../../rtk/superadmin/adminSlice";
import Sidebar from "./components/Sidebar";
import styles from "./dashboard/dashboard.module.css";
import { Poppins, Inter } from 'next/font/google';

// Load Poppins font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

// Load Inter font
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export default function AdminLayout({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

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

  if (!isAuthChecked) {
    return (
      <div className={styles.mainContent}>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${poppins.variable} ${inter.variable}`}>
      <Sidebar />
      <main className={`${styles.mainContent} ${poppins.className}`}>
        {children}
      </main>
    </div>
  );
}