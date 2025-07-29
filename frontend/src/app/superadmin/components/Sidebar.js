'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../styles/sidebar.module.css';
import LogoutModalTrigger from '../logout/page.js';

import { TbChecklist } from "react-icons/tb";
import { RiTreeFill } from "react-icons/ri";
import { HiViewGrid } from 'react-icons/hi';
import { FaUsersCog, FaUserCheck, FaClipboardCheck, FaRegQuestionCircle, FaRegAddressBook, FaAddressCard } from 'react-icons/fa';
import { MdSettings } from 'react-icons/md';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoGradientBorder}>
          <div className={styles.logoInnerWhite}>
            <Image 
              src="/default-profile.png" 
              width={45} 
              height={45} 
              alt="FAITH Logo" 
              unoptimized={true}
              onError={(e) => {
                console.error('Superadmin sidebar logo failed to load');
                e.target.src = "/default-profile.png";
              }}
            />
          </div>
        </div>
      </div>

      {/* SuperAdmin info */}
      <div className={styles.adminInfo}>
        <div className={styles.heading}>
          <span className={styles.helloText}>Hello, </span>
          <span className={styles.adminText}>SuperAdmin</span>
        </div>
        <div className={styles.emailText}>superadmin@faith.com</div>
      </div>

      {/* Menu Wrapper */}
      <div className={styles.menuWrapper}>
        {/* === GENERAL === */}
        <p className={styles.menuLabel}>General</p>
        <nav className={styles.nav}>
          <Link
            href="/superadmin"
            className={`${styles.navBase} ${styles.navItem} ${pathname === '/superadmin' ? styles.active : ''}`}
          >
            <HiViewGrid className={styles.dashbIcon} />
            <span>Dashboard</span>
          </Link>
        </nav>

        {/* === MANAGEMENT === */}
        <p className={styles.menuLabel}>Management</p>
        <nav className={styles.nav}>
          <Link
            href="/superadmin/organizations"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/organizations') ? styles.active : ''}`}
          >
            <FaUsersCog className={styles.icon} />
            <span>Organizations</span>
          </Link>

          <Link
            href="/superadmin/approvals"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/approvals') ? styles.active : ''}`}
          >
            <FaClipboardCheck className={styles.icon} />
            <span>Pending Approvals</span>
          </Link>

          <Link
            href="/superadmin/programs"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/programs') ? styles.active : ''}`}
          >
            <TbChecklist className={styles.icon} />
            <span>Programs</span>
          </Link>

          <Link
            href="/superadmin/faqs"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/faqs') ? styles.active : ''}`}
          >
            <FaRegQuestionCircle className={styles.icon} />
            <span>FAQs</span>
          </Link>

          <Link
            href="/superadmin/manageProfiles"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/manageprofiles') ? styles.active : ''}`}
          >
            <FaAddressCard className={styles.icon} />
            <span>Manage Profiles</span>
          </Link>

          <Link
            href="/admin/faithree"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/admin/faithree') ? styles.active : ''}`}
          >
            <RiTreeFill className={styles.icon} />
            <span>FAITHree</span>
          </Link>
        </nav>

        {/* === SETTINGS & ACCOUNT === */}
        <p className={styles.menuLabel} style={{ marginTop: "0.4rem" }}>Account</p>
        <nav className={styles.nav}>
          <Link
            href="/superadmin/settings"
            className={`${styles.navBase} ${styles.navItem} ${pathname.startsWith('/superadmin/settings') ? styles.active : ''}`}
          >
            <MdSettings className={styles.icon} />
            <span>Settings</span>
          </Link>

          {/* Logout Button */}
          <LogoutModalTrigger />
        </nav>
      </div>
    </aside>
  );
}