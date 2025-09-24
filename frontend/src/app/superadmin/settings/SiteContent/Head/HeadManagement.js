'use client';

import HeadsOfFacesManagement from './HeadsOfFacesManagement';
import styles from './HeadManagement.module.css';

export default function HeadManagement({ showSuccessModal }) {
  return (
    <div className={styles.container}>
      <HeadsOfFacesManagement showSuccessModal={showSuccessModal} />
    </div>
  );
}
