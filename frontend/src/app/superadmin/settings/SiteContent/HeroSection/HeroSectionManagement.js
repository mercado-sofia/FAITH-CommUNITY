'use client';

import styles from './HeroSectionManagement.module.css';

export default function HeroSectionManagement({ showSuccessModal }) {
  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Hero Section</h2>
          <p>Manage the main hero section content and banner images</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIcon}>🎯</div>
          <h3>Coming Soon</h3>
          <p>This feature will be implemented in a future update. You&apos;ll be able to manage your hero section content, including headlines, descriptions, call-to-action buttons, and background images.</p>
        </div>
      </div>
    </div>
  );
}
