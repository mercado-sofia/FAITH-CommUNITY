'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '../../../hooks/usePublicData';
import { getBrandingImageUrl } from '@/utils/uploadPaths';
import styles from './styles/Logo.module.css';

export default function Logo() {
  const { brandingData, isLoading } = usePublicBranding();

  // Only show logo if brandingData.logo_url exists
  if (!brandingData?.logo_url) {
    return null;
  }

  // name image priority:
  // 1) uploaded brandingData.name_url
  // 2) local /assets/logos/text-logo.png (public folder)
  // 3) fallback text
  const nameImageSrc = getBrandingImageUrl(brandingData?.name_url, 'name');

  return (
    <Link href="/" className={styles.logoContainer}>
      {/* Logo Image */}
      <Image
        src={getBrandingImageUrl(brandingData.logo_url, 'logo')}
        alt="FAITH CommUNITY Logo"
        width={45}
        height={45}
        priority
      />

      {/* Logo Name - uploaded image only */}
      {brandingData?.name_url && (
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
      )}
    </Link>
  );
}