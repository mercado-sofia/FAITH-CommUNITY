'use client';

import { useEffect, useState } from 'react';
import { isFallbackBannerActive } from '@/config/fallback';
import { isPortalDemoActive } from '@/config/portalDemo';
import styles from './DemoModeBanner.module.css';

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);
  const [isPortalDemo, setIsPortalDemo] = useState(false);

  useEffect(() => {
    setIsPortalDemo(isPortalDemoActive());
    setVisible(isPortalDemoActive() || isFallbackBannerActive());
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.text}>
        {isPortalDemo
          ? 'Demo mode — sample data only. Changes are not saved.'
          : 'Demo mode — sample data is shown because the live API is unavailable.'}
      </span>
    </div>
  );
}
