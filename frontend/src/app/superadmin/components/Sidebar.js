'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../styles/sidebar.module.css';
import LogoutModalTrigger from '../logout/page.js';

import { TbChecklist } from "react-icons/tb";
import { RiTreeFill } from "react-icons/ri";
import { HiViewGrid } from 'react-icons/hi';
import { FaUsersCog, FaUserCheck, FaClipboardCheck, FaRegQuestionCircle, FaRegAddressBook } from 'react-icons/fa';
import { MdSettings } from 'react-icons/md';

import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

export default function Sidebar() {
  const pathname = usePathname();

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

      {/* Main Nav Items */}
      <div className={styles.navSection}>
        <p className={styles.menuLabel}>Menu</p>
        <nav className={styles.nav}>
          <Link href="/superadmin" className={`${styles.navItem} ${pathname === '/superadmin' ? styles.active : ''}`}>
            <HiViewGrid className={styles.icon} />
            <span>Dashboard</span>
          </Link>

          <Link href="/superadmin/organizations" className={`${styles.navItem} ${pathname.startsWith('/superadmin/organizations') ? styles.active : ''}`}>
            <FaUsersCog className={styles.icon} />
            <span>Organizations</span>
          </Link>

          <Link href="/superadmin/approvals" className={`${styles.navItem} ${pathname.startsWith('/superadmin/approvals') ? styles.active : ''}`}>
            <FaClipboardCheck className={styles.icon} />
            <span>Pending Approvals</span>
          </Link>

          <Link href="/superadmin/volunteers" className={`${styles.navItem} ${pathname.startsWith('/superadmin/volunteers') ? styles.active : ''}`}>
            <FaUserCheck className={styles.icon} />
            <span>Volunteers</span>
          </Link>

          <Link href="/superadmin/programs" className={`${styles.navItem} ${pathname.startsWith('/superadmin/programs') ? styles.active : ''}`}>
            <TbChecklist className={styles.icon} />
            <span>Programs</span>
          </Link>

          <Link href="/superadmin/faqs" className={`${styles.navItem} ${pathname.startsWith('/superadmin/faqs') ? styles.active : ''}`}>
            <FaRegQuestionCircle className={styles.icon} />
            <span>FAQs</span>
          </Link>

          <Link href="/superadmin/accounts" className={`${styles.navItem} ${pathname.startsWith('/superadmin/accounts') ? styles.active : ''}`}>
            <FaRegAddressBook className={styles.icon} />
            <span>Accounts</span>
          </Link>

          <p className={styles.menuLabel}>Visual</p>
          <Link href="/admin/faithree" className={`${styles.navItem} ${pathname.startsWith('/admin/faithree') ? styles.active : ''}`}>
            <RiTreeFill className={styles.icon} />
            <span>FAITHree</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Section: Settings + Logout */}
      <div className={styles.bottomSection}>
        <Link href="/superadmin/settings" className={`${styles.navItem} ${pathname.startsWith('/superadmin/settings') ? styles.active : ''}`}>
          <MdSettings className={styles.icon} />
          <span>Settings</span>
        </Link>

        {/* Uncomment once your modal works */}
        <LogoutModalTrigger />
      </div>
    </aside>
  );
}