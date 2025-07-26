'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './styles/navbar.module.css';
import { FaBars, FaChevronRight } from 'react-icons/fa';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);

  const handleCloseSidebar = () => {
    setIsSlidingOut(true);
    setTimeout(() => {
      setMenuOpen(false);
      setIsSlidingOut(false);
    }, 300);
  };

  const toggleMenu = () => {
    if (menuOpen) {
      handleCloseSidebar();
    } else {
      setMenuOpen(true);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1180) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={styles.navbarWrapper}>
      <nav className={styles.navbar}>
        {/* Logo */}
        <Link href="/" className={styles.logoContainer}>
          <Image
            src="/logo/faith_community_logo.png"
            alt="FAITH CommUNITY Logo"
            width={45}
            height={46}
          />
          <div className={styles.logoTextWrapper}>
            <span className={styles.logoTop}>FAITH</span>
            <span className={styles.logoBottom}>
              Comm<strong className={styles.orange}>UNITY</strong>
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/about" className={styles.navLink}>About Us</Link>
          <Link href="/programs" className={styles.navLink}>Programs and Services</Link>
          <Link href="/#faithree" className={styles.navLink}>FAIThree</Link>
          <Link href="/faqs" className={styles.navLink}>FAQs</Link>
        </div>

        {/* Right Actions */}
        <div className={styles.rightActions}>
          <a
            href="https://www.firstasia.edu.ph/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.faithBtn}
          >
            <Image
              src="/logo/faith_logo.png"
              alt="FAITH Logo"
              width={18}
              height={18}
            />
            <span>Go To FAITH Colleges</span>
          </a>
          <Link href="/apply" className={styles.applyBtn}>Apply</Link>

          {/* Hamburger Icon */}
          <button className={styles.hamburgerBtn} onClick={toggleMenu}>
            <FaBars />
          </button>
        </div>

        {/* Mobile Sidebar */}
        {menuOpen && (
          <div className={`${styles.mobileSidebar} ${isSlidingOut ? styles.slideOut : styles.showSidebar}`}>
            {/* Close Button */}
            <button className={styles.closeSidebarBtn} onClick={toggleMenu}>
              <FaChevronRight />
            </button>

            {/* Mobile Nav Links */}
            <Link href="/" className={styles.mobileNavLink} onClick={toggleMenu}>Home</Link>
            <Link href="/about" className={styles.mobileNavLink} onClick={toggleMenu}>About Us</Link>
            <Link href="/programs" className={styles.mobileNavLink} onClick={toggleMenu}>Programs and Services</Link>
            <Link href="/#faithree" className={styles.mobileNavLink} onClick={toggleMenu}>FAIThree</Link>
            <Link href="/faqs" className={styles.mobileNavLink} onClick={toggleMenu}>FAQs</Link>

            {/* Mobile Buttons */}
            <div className={styles.mobileButtons}>
              <a
                href="https://www.firstasia.edu.ph/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.faithBtn}
              >
                <Image
                  src="/logo/faith_logo.png"
                  alt="FAITH Logo"
                  width={18}
                  height={18}
                />
                <span>FAITH Colleges</span>
              </a>
              <Link href="/apply" className={styles.applyBtn} onClick={toggleMenu}>Apply</Link>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}