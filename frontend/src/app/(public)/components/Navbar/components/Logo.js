'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '../../../hooks/usePublicData';
import styles from './styles/Logo.module.css';

export default function Logo() {
  const { brandingData, isLoading } = usePublicBranding();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  const logoSrc = brandingData?.logo_url
    ? `${apiBase}${brandingData.logo_url}`
    : '/logo/faith_community_logo.png';

  // name image priority:
  // 1) uploaded brandingData.name_url
  // 2) local /text-logo.png (public folder)
  // 3) fallback text
  const nameImageSrc = brandingData?.name_url ? `${apiBase}${brandingData.name_url}` : '/text-logo.png';

  return (
    <Link href="/" className={styles.logoContainer}>
      {/* Logo Image */}
      <Image
        src={logoSrc}
        alt="FAITH CommUNITY Logo"
        width={45}
        height={45}
        priority
      />

      {/* Logo Name - uploaded image -> local image -> fallback text */}
      {brandingData?.name_url ? (
        <div className={styles.logoNameImage}>
          <Image
            src={nameImageSrc}
            alt="FAITH CommUNITY"
            width={140}
            height={40}
            priority
            style={{ objectFit: 'contain' }}
          />
        </div>
      ) : (
        // Text fallback when local image is missing
        <div className={styles.logoTextWrapper}>
          <span className={styles.logoTop}>FAITH</span>
          <span className={styles.logoBottom}>
            CommUNITY
          </span>
        </div>
      )}
    </Link>
  );
}