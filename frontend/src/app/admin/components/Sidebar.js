"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import { selectCurrentAdmin } from "../../../rtk/superadmin/adminSlice"
import styles from "../styles/sidebar.module.css"
import LogoutModalTrigger from "../logout/page.js"
import { FaUserCheck } from "react-icons/fa"
import { HiFlag } from "react-icons/hi2"
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi"
import { RiTreeFill } from "react-icons/ri"
import { TbChecklist } from "react-icons/tb"
import { FaRegFolderOpen } from "react-icons/fa6"
import "@fontsource/inter/400.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"

export default function Sidebar() {
  const pathname = usePathname()
  const currentAdmin = useSelector(selectCurrentAdmin)

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <Image src="/logo/faith_community_logo.png" width={40} height={40} alt="FAITH Logo" />
        <div className={styles.logoText}>
          <span className={styles.faith}>FAITH</span>
          <span className={styles.community}>CommUNITY</span>
        </div>
      </div>

      {/* Admin Info */}
      {currentAdmin && (
        <div style={{ padding: "1rem", borderBottom: "1px solid #eee", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#666" }}>Logged in as:</div>
          <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>{currentAdmin.org_name}</div>
          <div style={{ fontSize: "0.8rem", color: "#888" }}>{currentAdmin.email}</div>
        </div>
      )}

      {/* === GENERAL === */}
      <p className={styles.menuLabel}>General</p>
      <nav className={styles.nav}>
        <Link href="/admin" className={`${styles.navItem} ${pathname === "/admin" ? styles.active : ""}`}>
          <HiViewGrid className={styles.icon} />
          <span>Dashboard</span>
        </Link>
      </nav>

      {/* === MANAGEMENT === */}
      <p className={styles.menuLabel}>Management</p>
      <nav className={styles.nav}>
        <Link
          href="/admin/volunteers"
          className={`${styles.navItem} ${pathname.startsWith("/admin/volunteers") ? styles.active : ""}`}
        >
          <FaUserCheck className={styles.icon} />
          <span>Volunteers</span>
        </Link>

        <Link
          href="/admin/orgdetails"
          className={`${styles.navItem} ${pathname.startsWith("/admin/orgdetails") ? styles.active : ""}`}
        >
          <HiOfficeBuilding className={styles.icon} />
          <span>Organization</span>
        </Link>

        <Link
          href="/admin/programs"
          className={`${styles.navItem} ${pathname.startsWith("/admin/programs") ? styles.active : ""}`}
        >
          <TbChecklist className={styles.icon} />
          <span>Programs</span>
        </Link>

        <Link
          href="/admin/highlights"
          className={`${styles.navItem} ${pathname.startsWith("/admin/highlights") ? styles.active : ""}`}
        >
          <HiFlag className={styles.icon} />
          <span>Highlights</span>
        </Link>

        <Link
          href="/admin/submissions"
          className={`${styles.navItem} ${pathname.startsWith("/admin/submissions") ? styles.active : ""}`}
        >
          <FaRegFolderOpen className={styles.icon} />
          <span>Submissions</span>
        </Link>
      </nav>

      {/* === VISUAL === */}
      <p className={styles.menuLabel}>Visual</p>
      <nav className={styles.nav}>
        <Link
          href="/admin/faithree"
          className={`${styles.navItem} ${pathname.startsWith("/admin/faithree") ? styles.active : ""}`}
        >
          <RiTreeFill className={styles.icon} />
          <span>FAITHree</span>
        </Link>
      </nav>

      {/* Log Out */}
      <LogoutModalTrigger />
    </aside>
  )
}
