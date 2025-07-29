"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import { useState, useEffect } from "react"
import { selectCurrentAdmin } from "../../../rtk/superadmin/adminSlice"
import styles from "./sidebar.module.css"
import LogoutModalTrigger from "../logout/page.js"
import { FaUserCheck } from "react-icons/fa"
import { HiOutlineNewspaper, HiOutlineCog } from "react-icons/hi2"
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi"
import { TbChecklist } from "react-icons/tb"
import { FaRegFolderOpen } from "react-icons/fa6"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export default function Sidebar() {
  const pathname = usePathname()
  const currentAdmin = useSelector(selectCurrentAdmin)
  const [orgLogo, setOrgLogo] = useState(null)

  // Fetch organization logo
  useEffect(() => {
    const fetchOrgLogo = async () => {
      if (!currentAdmin?.org) return
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/organization/org/${currentAdmin.org}`)
        const result = await response.json()
        
        if (result.success && result.data?.logo) {
          setOrgLogo(result.data.logo)
        }
      } catch (error) {
        console.error('Failed to fetch organization logo:', error)
      }
    }

    fetchOrgLogo()
  }, [currentAdmin?.org])

  return (
    <aside className={styles.sidebar}>
      {/* Admin */}
      <div className={styles.logo}>
        <div className={styles.logoGradientBorder}>
          <div className={styles.logoInnerWhite}>
            <Image
              src={orgLogo || "/default-profile.png"}
              width={45}
              height={45}
              alt="Organization Logo"
              unoptimized={true}
              onError={(e) => {
                console.error('Sidebar logo failed to load:', orgLogo);
                e.target.src = "/default-profile.png";
              }}
            />
          </div>
        </div>
      </div>

      {/* Admin info */}
      {currentAdmin && (
        <div className={styles.adminInfo}>
          <div className={styles.heading}>
            <span className={styles.helloText}>Hello, </span>
            <span className={styles.adminText}>Admin</span>
          </div>
          <div className={styles.emailText}>{currentAdmin.email}</div>
        </div>
      )}

      {/* Menu Wrapper */}
      <div className={styles.menuWrapper}>
        {/* === GENERAL === */}
        <p className={styles.menuLabel}>General</p>
        <nav className={styles.nav}>
          <Link
            href="/admin/dashboard"
            className={`${styles.navBase} ${styles.navItem} ${pathname === "/admin/dashboard" ? styles.active : ""}`}
          >
            <HiViewGrid className={styles.dashbIcon} />
            <span>Dashboard</span>
          </Link>
        </nav>

        {/* === MANAGEMENT === */}
        <p className={styles.menuLabel}>Management</p>
        <nav className={styles.nav}>
          <Link
            href="/admin/volunteers"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/volunteers") ? styles.active : ""}`}
          >
            <FaUserCheck className={styles.icon} />
            <span>Volunteers</span>
          </Link>

          <Link
            href="/admin/organization"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/organization") ? styles.active : ""}`}
          >
            <HiOfficeBuilding className={styles.icon} />
            <span>Organization</span>
          </Link>

          <Link
            href="/admin/programs"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/programs") ? styles.active : ""}`}
          >
            <TbChecklist className={styles.icon} />
            <span>Programs</span>
          </Link>

          <Link
            href="/admin/news"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/news") ? styles.active : ""}`}
          >
            <HiOutlineNewspaper className={styles.icon} />
            <span>
              News <span className={styles.updateText}>Update</span>
            </span>
          </Link>

          <Link
            href="/admin/submissions"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/submissions") ? styles.active : ""}`}
          >
            <FaRegFolderOpen className={styles.icon} />
            <span>Submissions</span>
          </Link>
        </nav>

        {/* === SETTINGS & ACCOUNT === */}
        <p className={styles.menuLabel} style={{ marginTop: "0.4rem" }}>Account</p>
        <nav className={styles.nav}>
          <Link
            href="/admin/settings"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/settings") ? styles.active : ""}`}
          >
            <HiOutlineCog className={styles.icon} />
            <span>Settings</span>
          </Link>

          {/* Logout Button */}
          <LogoutModalTrigger />
        </nav>
      </div>
    </aside>
  )
}