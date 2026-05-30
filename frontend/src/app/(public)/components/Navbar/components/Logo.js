'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '@/hooks/(public)/usePublicData';
import { getBrandingImageUrl, isLocalPublicPath } from '@/utils/shared/uploadPaths';
import { FALLBACK_ICON_LOGO_URL, FALLBACK_TEXT_LOGO_URL } from '@/utils/shared/brandingDefaults';
import styles from './styles/Logo.module.css';

function resolveBrandingUrl(url, type) {
  if (!url) {
    return getBrandingImageUrl(null, type);
  }
  if (url.startsWith('http') || isLocalPublicPath(url)) {
    return url;
  }
  return getBrandingImageUrl(url, type);
}

export default function Logo() {
  const { brandingData, isLoading } = usePublicBranding();

  if (isLoading || !brandingData) {
    return null;
  }

  const logoUrl = brandingData.logo_url
    ? resolveBrandingUrl(brandingData.logo_url, 'logo')
    : FALLBACK_ICON_LOGO_URL;
  const nameUrl = resolveBrandingUrl(
    brandingData.name_url || FALLBACK_TEXT_LOGO_URL,
    'name'
  );

  return (
    <Link href="/" className={styles.logoContainer}>
      <Image
        src={logoUrl}
        alt="FAITH CommUNITY Logo"
        width={45}
        height={45}
        priority
        className={styles.logoImage}
        onError={(e) => {
          e.currentTarget.src = FALLBACK_ICON_LOGO_URL;
        }}
      />

      <div className={styles.logoNameImage}>
        <Image
          src={nameUrl}
          alt="FAITH CommUNITY"
          width={140}
          height={40}
          priority
          style={{ objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_TEXT_LOGO_URL;
          }}
        />
      </div>
    </Link>
  );
}
