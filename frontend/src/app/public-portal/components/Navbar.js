"use client"

import Image from "next/image"
import Link from "next/link"
import styles from "../styles/navbar.module.css"

export default function Navbar() {
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

        {/* Nav Links */}
        <div className={styles.navLinks}>
          <Link href="/" className={styles.navLink}>Home</Link>
          <Link href="/about" className={styles.navLink}>About Us</Link>
          <Link href="/programs" className={styles.navLink}>Programs and Services</Link>
          <Link href="/#faithree" className={styles.navLink}>FAIThree</Link>
          <Link href="/faqs" className={styles.navLink}>FAQs</Link>
        </div>

        {/* Right Buttons */}
        <div className={styles.rightActions}>
        <a
          href="https://www.firstasia.edu.ph/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.faithBtn}
        >
          <Image src="/logo/faith_logo.png" alt="FAITH Logo" width={18} height={18} />
          <span>Go To FAITH Colleges</span>
        </a>
        <Link href="/apply" className={styles.applyBtn}>
          Apply
        </Link>
        </div>
      </nav>
    </div>
  )
}