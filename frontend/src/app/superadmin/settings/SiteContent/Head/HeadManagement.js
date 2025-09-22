'use client';

import styles from './HeadManagement.module.css';

export default function HeadManagement({ showSuccessModal }) {
  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Head Content</h2>
          <p>Manage meta tags, SEO settings, and head section content</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIcon}>🔍</div>
          <h3>Coming Soon</h3>
          <p>This feature will be implemented in a future update. You&apos;ll be able to manage meta tags, SEO settings, and other head section content for better search engine optimization.</p>
        </div>
      </div>
    </div>
  );
}
