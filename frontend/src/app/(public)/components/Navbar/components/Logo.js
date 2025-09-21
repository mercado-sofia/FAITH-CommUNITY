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
      <Image
        src="/text-logo.png"
        alt="FAITH CommUNITY Text Logo"
        width={140}
        height={40}
        priority
      />
    </Link>
  );
}
