"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/Sidebar"
import TopBar from "./components/TopBar"
import styles from "./styles/dashboard.module.css"
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

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    const superAdminToken = localStorage.getItem("superAdminToken");
    const superAdminData = localStorage.getItem("superAdminData");
    const userRole = document.cookie.includes("userRole=superadmin");

    if (!superAdminToken || !superAdminData || !userRole) {
      router.push("/login");
    } else {
      setIsAuthChecked(true);
    }
  }, [router]);

  if (!isAuthChecked) {
    return (
      <div className={styles.mainContent}>
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <p>Checking superadmin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${poppins.variable} ${inter.variable} ${urbanist.variable}`}>
      <Sidebar />
      <TopBar />
      <main className={`${styles.mainContent} ${poppins.className}`}>
        {children}
      </main>
    </div>
  );
}
