'use client';

import styles from './AboutUsManagement.module.css';

export default function AboutUsManagement({ showSuccessModal }) {
  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>About Us Content</h2>
          <p>Manage the About Us section content for your website</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIcon}>📝</div>
          <h3>Coming Soon</h3>
          <p>This feature will be implemented in a future update. You&apos;ll be able to manage your About Us content, including descriptions, team information, and organizational details.</p>
        </div>
      </div>
    </div>
  );
}
