"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import { selectCurrentAdmin } from "../../../rtk/superadmin/adminSlice"
import { useAdminOrganization } from "../../../hooks/useAdminData"
import { useNavigation } from "../../../contexts/NavigationContext"
import { getOrganizationImageUrl } from "@/utils/uploadPaths"
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
  const { handleNavigation, isLinkLoading } = useNavigation()
  
  // Use SWR hook for organization data
  const { organization } = useAdminOrganization(currentAdmin?.org)
  const orgLogo = organization?.logo

  return (
    <aside className={styles.sidebar}>
      {/* Admin */}
      <div className={styles.logo}>
        <div className={styles.logoGradientBorder}>
          <div className={styles.logoInnerWhite}>
            <Image
              src={orgLogo ? getOrganizationImageUrl(orgLogo, 'logo') : "/default-profile.png"}
              width={45}
              height={45}
              alt="Organization Logo"
              unoptimized={true}
              onError={(e) => {
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
            className={`${styles.navBase} ${styles.navItem} ${pathname === "/admin/dashboard" ? styles.active : ""} ${isLinkLoading("/admin/dashboard") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/dashboard")}
          >
            <HiViewGrid className={styles.dashbIcon} />
            <span>Dashboard</span>
            {isLinkLoading("/admin/dashboard") && <div className={styles.loadingSpinner}></div>}
          </Link>
        </nav>

        {/* === MANAGEMENT === */}
        <p className={styles.menuLabel}>Management</p>
        <nav className={styles.nav}>
          <Link
            href="/admin/volunteers"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/volunteers") ? styles.active : ""} ${isLinkLoading("/admin/volunteers") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/volunteers")}
          >
            <FaUserCheck className={styles.icon} />
            <span>Volunteers</span>
            {isLinkLoading("/admin/volunteers") && <div className={styles.loadingSpinner}></div>}
          </Link>

          <Link
            href="/admin/organization"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/organization") ? styles.active : ""} ${isLinkLoading("/admin/organization") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/organization")}
          >
            <HiOfficeBuilding className={styles.icon} />
            <span>Organization</span>
            {isLinkLoading("/admin/organization") && <div className={styles.loadingSpinner}></div>}
          </Link>

          <Link
            href="/admin/programs"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/programs") ? styles.active : ""} ${isLinkLoading("/admin/programs") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/programs")}
          >
            <TbChecklist className={styles.icon} />
            <span>Programs</span>
            {isLinkLoading("/admin/programs") && <div className={styles.loadingSpinner}></div>}
          </Link>

          <Link
            href="/admin/news"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/news") ? styles.active : ""} ${isLinkLoading("/admin/news") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/news")}
          >
            <HiOutlineNewspaper className={styles.icon} />
            <span>
              News <span className={styles.updateText}>Update</span>
            </span>
            {isLinkLoading("/admin/news") && <div className={styles.loadingSpinner}></div>}
          </Link>

          <Link
            href="/admin/submissions"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/submissions") ? styles.active : ""} ${isLinkLoading("/admin/submissions") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/submissions")}
          >
            <FaRegFolderOpen className={styles.icon} />
            <span>Submissions</span>
            {isLinkLoading("/admin/submissions") && <div className={styles.loadingSpinner}></div>}
          </Link>
        </nav>

        {/* === SETTINGS & ACCOUNT === */}
        <p className={styles.menuLabel} style={{ marginTop: "0.4rem" }}>Account</p>
        <nav className={styles.nav}>
          <Link
            href="/admin/settings"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/settings") ? styles.active : ""} ${isLinkLoading("/admin/settings") ? styles.loading : ""}`}
            onClick={() => handleNavigation("/admin/settings")}
          >
            <HiOutlineCog className={styles.icon} />
            <span>Settings</span>
            {isLinkLoading("/admin/settings") && <div className={styles.loadingSpinner}></div>}
          </Link>

          {/* Logout Button */}
          <LogoutModalTrigger />
        </nav>
      </div>
    </aside>
  )
}