'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '@/hooks/(public)/usePublicData';
import { getBrandingImageUrl } from '@/utils/shared/uploadPaths';
import styles from './styles/Logo.module.css';

export default function Logo() {
  const { brandingData, isLoading } = usePublicBranding();

  // Only show logo if brandingData.logo_url exists - no fallback, show nothing if not uploaded
  if (!brandingData?.logo_url) {
    return null;
  }

  // Use URLs directly from branding data
  // Cloudinary URLs are full URLs starting with https://, so use them directly
  // getBrandingImageUrl handles URL construction for edge cases but returns full URLs as-is
  const logoUrl = brandingData.logo_url.startsWith('http') 
    ? brandingData.logo_url 
    : getBrandingImageUrl(brandingData.logo_url, 'logo');
  const nameUrl = brandingData?.name_url 
    ? (brandingData.name_url.startsWith('http') 
        ? brandingData.name_url 
        : getBrandingImageUrl(brandingData.name_url, 'name'))
    : null;

  return (
    <Link href="/" className={styles.logoContainer}>
      {/* Logo Image - only shown if logo_url exists */}
      <Image
        src={logoUrl}
        alt="FAITH CommUNITY Logo"
        width={45}
        height={45}
        priority
        className={styles.logoImage}
      />

      {/* Logo Name - only show if name_url exists in branding data */}
      {brandingData?.name_url && nameUrl && (
        <div className={styles.logoNameImage}>
          <Image
            src={nameUrl}
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