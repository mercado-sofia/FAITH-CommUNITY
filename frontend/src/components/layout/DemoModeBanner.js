'use client';

import { useEffect, useState } from 'react';
import { isFallbackBannerActive } from '@/config/fallback';
import styles from './DemoModeBanner.module.css';

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(isFallbackBannerActive());
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.text}>
        Demo mode — sample data is shown because the live API is unavailable.
      </span>
    </div>
  );
}
