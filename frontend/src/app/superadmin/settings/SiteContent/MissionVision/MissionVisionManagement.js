'use client';

import styles from './MissionVisionManagement.module.css';

export default function MissionVisionManagement({ showSuccessModal }) {
  return (
    <div className={styles.settingsPanel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <h2>Mission & Vision</h2>
          <p>Manage your organization&apos;s mission and vision statements</p>
        </div>
      </div>

      <div className={styles.panelContent}>
        <div className={styles.placeholderContent}>
          <div className={styles.placeholderIcon}>🎯</div>
          <h3>Coming Soon</h3>
          <p>This feature will be implemented in a future update. You&apos;ll be able to manage your organization&apos;s mission and vision statements, values, and other foundational content.</p>
        </div>
      </div>
    </div>
  );
}
