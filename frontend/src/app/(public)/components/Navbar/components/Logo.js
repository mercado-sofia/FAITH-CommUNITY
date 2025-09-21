'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '../../../hooks/usePublicData';
import styles from './styles/Logo.module.css';

export default function Logo() {
  const { brandingData, isLoading } = usePublicBranding();

  return (
    <Link href="/" className={styles.logoContainer}>
      {/* Logo Image */}
      <Image
        src={brandingData?.logo_url ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.logo_url}` : "/logo/faith_community_logo.png"}
        alt="FAITH CommUNITY Logo"
        width={45}
        height={46}
        priority
      />
      
      {/* Logo Name - either from uploaded image or fallback text */}
      {brandingData?.name_url ? (
        <div className={styles.logoNameImage}>
          <Image
            src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${brandingData.name_url}`}
            alt="FAITH CommUNITY"
            width={120}
            height={30}
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>
      ) : (
        <div className={styles.logoTextWrapper}>
          <span className={styles.logoTop}>FAITH</span>
          <span className={styles.logoBottom}>
            Comm<strong className={styles.orange}>UNITY</strong>
          </span>
        </div>
      )}
    </Link>
  );
}
