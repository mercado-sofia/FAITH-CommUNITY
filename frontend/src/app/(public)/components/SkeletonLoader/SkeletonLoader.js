'use client';

import styles from './SkeletonLoader.module.css';

export default function SkeletonLoader({ type = 'section', count = 1, className = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'notifications':
        return (
          <div className={styles.notificationsSkeleton}>
            {Array.from({ length: count || 3 }).map((_, index) => (
              <div key={index} className={styles.notificationItemSkeleton}>
                <div className={styles.notificationIconSkeleton} />
                <div className={styles.notificationContentSkeleton}>
                  <div className={styles.notificationTitleSkeleton} />
                  <div className={styles.notificationMessageSkeleton} />
                  <div className={styles.notificationDateSkeleton} />
                </div>
                <div className={styles.notificationActionsSkeleton}>
                  <div className={styles.actionButtonSkeleton} />
                  <div className={styles.actionButtonSkeleton} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'applications':
        return (
          <div className={styles.applicationsSkeleton}>
            {Array.from({ length: count || 2 }).map((_, index) => (
              <div key={index} className={styles.applicationCardSkeleton}>
                <div className={styles.applicationImageSkeleton} />
                <div className={styles.applicationContentSkeleton}>
                  <div className={styles.applicationTitleSkeleton} />
                  <div className={styles.applicationOrgSkeleton} />
                  <div className={styles.applicationDetailsSkeleton}>
                    <div className={styles.applicationDetailItemSkeleton} />
                    <div className={styles.applicationDetailItemSkeleton} />
                  </div>
                  <div className={styles.applicationStatusSkeleton} />
                </div>
                <div className={styles.applicationActionsSkeleton}>
                  <div className={styles.applicationActionButtonSkeleton} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'form':
        return (
          <div className={styles.formSkeleton}>
            {Array.from({ length: count || 4 }).map((_, index) => (
              <div key={index} className={styles.formGroupSkeleton}>
                <div className={styles.formLabelSkeleton} />
                <div className={styles.formInputSkeleton} />
              </div>
            ))}
          </div>
        );

      case 'section':
      default:
        return (
          <div className={styles.sectionSkeleton}>
            <div className={styles.headerSkeleton}>
              <div className={styles.titleSkeleton} />
            </div>
            <div className={styles.contentSkeleton}>
              <div className={styles.textSkeleton} />
              <div className={styles.textSkeleton} />
              <div className={styles.textSkeleton} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className={`${styles.skeletonContainer} ${className}`}>
      {renderSkeleton()}
    </div>
  );
}

