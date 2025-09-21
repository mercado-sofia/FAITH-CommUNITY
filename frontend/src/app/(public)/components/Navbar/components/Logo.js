'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './styles/Logo.module.css';

export default function Logo() {
  return (
    <Link href="/" className={styles.logoContainer}>
      <Image
        src="/logo/faith_community_logo.png"
        alt="FAITH CommUNITY Logo"
        width={45}
        height={46}
        priority
      />
      <div className={styles.logoTextWrapper}>
        <span className={styles.logoTop}>FAITH</span>
        <span className={styles.logoBottom}>
          Comm<strong className={styles.orange}>UNITY</strong>
        </span>
      </div>
    </Link>
  );
}
