'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePublicBranding } from '@/hooks/(public)/usePublicData';
import { getBrandingImageUrl, isLocalPublicPath } from '@/utils/shared/uploadPaths';
import { FALLBACK_TEXT_LOGO_URL } from '@/utils/shared/brandingDefaults';
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

  const nameUrl = resolveBrandingUrl(
    brandingData.name_url || FALLBACK_TEXT_LOGO_URL,
    'name'
  );
  const hasIconLogo = Boolean(brandingData.logo_url);

  return (
    <Link href="/" className={styles.logoContainer}>
      {hasIconLogo && (
        <Image
          src={resolveBrandingUrl(brandingData.logo_url, 'logo')}
          alt="FAITH CommUNITY Logo"
          width={45}
          height={45}
          priority
          className={styles.logoImage}
        />
      )}

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
