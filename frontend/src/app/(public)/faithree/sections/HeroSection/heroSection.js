'use client';

import styles from './heroSection.module.css';

export default function HeroSection() {
  return (
    <div className={styles.heroSection}>
      <div className={styles.heroContent}>
        <h2 className={styles.sectionTitle}>Welcome to FAITHree Community</h2>
        <p className={styles.sectionDescription}>
          Discover stories, connect with members, and be part of a growing community 
          that nurtures faith, hope, and love.
        </p>
      </div>
    </div>
  );
}
