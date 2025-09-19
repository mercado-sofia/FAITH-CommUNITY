"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSelector } from "react-redux"
import { selectCurrentAdmin } from "../../../rtk/superadmin/adminSlice"
import { useAdminOrganization } from "../hooks/useAdminData"
import { useNavigation } from "../../../contexts/NavigationContext"
import { getOrganizationImageUrl } from "@/utils/uploadPaths"
import styles from "./styles/sidebar.module.css"
import LogoutModalTrigger from "../logout/page.js"
import { FaUserCheck } from "react-icons/fa"
import { HiOutlineNewspaper, HiOutlineCog } from "react-icons/hi2"
import { HiViewGrid, HiOfficeBuilding } from "react-icons/hi"
import { TbChecklist } from "react-icons/tb"
import { FaRegFolderOpen } from "react-icons/fa6"

export default function Sidebar() {
  const pathname = usePathname()
  const currentAdmin = useSelector(selectCurrentAdmin)
  const { handleNavigation } = useNavigation()
  
  // Use SWR hook for organization data
  const { organization } = useAdminOrganization(currentAdmin?.organization_id)
  // Use SWR data first, fallback to Redux store, then default
  const orgLogo = organization?.logo || currentAdmin?.logo

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
            href="/admin"
            className={`${styles.navBase} ${styles.navItem} ${pathname === "/admin" ? styles.active : ""}`}
            onClick={() => handleNavigation("/admin")}
            prefetch={true}
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
            onClick={() => handleNavigation("/admin/volunteers")}
            prefetch={true}
          >
            <FaUserCheck className={styles.icon} />
            <span>Volunteers</span>
          </Link>

          <Link
            href="/admin/organization"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/organization") ? styles.active : ""}`}
            onClick={() => handleNavigation("/admin/organization")}
            prefetch={true}
          >
            <HiOfficeBuilding className={styles.icon} />
            <span>Organization</span>
          </Link>

          <Link
            href="/admin/programs"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/programs") ? styles.active : ""}`}
            onClick={() => handleNavigation("/admin/programs")}
            prefetch={true}
          >
            <TbChecklist className={styles.icon} />
            <span>Programs</span>
          </Link>

          <Link
            href="/admin/news"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/news") ? styles.active : ""}`}
            onClick={() => handleNavigation("/admin/news")}
            prefetch={true}
          >
            <HiOutlineNewspaper className={styles.icon} />
            <span>
              News <span className={styles.updateText}>Update</span>
            </span>
          </Link>

          <Link
            href="/admin/submissions"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith("/admin/submissions") ? styles.active : ""}`}
            onClick={() => handleNavigation("/admin/submissions")}
            prefetch={true}
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
            onClick={() => handleNavigation("/admin/settings")}
            prefetch={true}
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