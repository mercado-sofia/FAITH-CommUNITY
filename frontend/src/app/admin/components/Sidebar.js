"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import { selectCurrentAdmin } from "../../../rtk/superadmin/adminSlice"
import styles from "./sidebar.module.css"
import LogoutModalTrigger from "../logout/page.js"
import { FaUserCheck } from "react-icons/fa"
import { HiOutlineNewspaper, HiOutlineCog } from "react-icons/hi2"
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi"
import { TbChecklist } from "react-icons/tb"
import { FaRegFolderOpen } from "react-icons/fa6"

export default function Sidebar() {
  const pathname = usePathname()
  const currentAdmin = useSelector(selectCurrentAdmin)

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoGradientBorder}>
          <div className={styles.logoInnerWhite}>
            <Image
              src={currentAdmin?.org_logo || "/logo/faith_community_logo.png"}
              width={45}
              height={45}
              alt="Organization Logo"
            />
          </div>
        </div>
      </div>

      {/* Admin info */}
      {currentAdmin && (
        <div style={{ padding: "0 2.8rem 1.4rem" }}>
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
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/orgdetails") ? styles.active : ""}`}
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

          {/* Logout Button as standalone, not inside another button */}
          <LogoutModalTrigger />
        </nav>
      </div>
    </aside>
  )
}