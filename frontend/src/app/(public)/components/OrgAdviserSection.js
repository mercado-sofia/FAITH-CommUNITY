'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '../styles/OrgAdviserSection.module.css';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFacebookF,
  FaEnvelope,
  FaPlus,
} from 'react-icons/fa';

const orgAdvisers = [
  { name: 'Jana Mae A. Cruz', role: 'Dean', image: '/id/id5.jpg', facebook: '#', email: 'org1@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Chair', image: '/id/id1.jpg', facebook: '#', email: 'org2@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Org Adviser', image: '/id/id2.jpg', facebook: '#', email: 'org3@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Org Adviser', image: '/id/id3.jpg', facebook: '#', email: 'org4@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Dean', image: '/id/id5.jpg', facebook: '#', email: 'org1@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Chair', image: '/id/id1.jpg', facebook: '#', email: 'org2@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Org Adviser', image: '/id/id2.jpg', facebook: '#', email: 'org3@email.com' },
  { name: 'Jana Mae A. Cruz', role: 'Org Adviser', image: '/id/id3.jpg', facebook: '#', email: 'org4@email.com' },
];

export default function OrgAdviserSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const [cardWidth, setCardWidth] = useState(240);
  const [cardGap, setCardGap] = useState(24);

  // Responsive config
  useEffect(() => {
    const updateResponsiveValues = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setCardWidth(220);
        setCardGap(16);
        setVisibleCount(1);
      } else if (width < 964) {
        setCardWidth(240);
        setCardGap(20);
        setVisibleCount(2);
      } else if (width < 1160) {
        setCardWidth(240);
        setCardGap(24);
        setVisibleCount(3);
      } else {
        setCardWidth(240);
        setCardGap(24);
        setVisibleCount(4);
      }
    };

    updateResponsiveValues();
    window.addEventListener('resize', updateResponsiveValues);
    return () => window.removeEventListener('resize', updateResponsiveValues);
  }, []);

  // Navigation handlers using useCallback
  const handlePrev = useCallback(() => {
    setStartIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setStartIndex((prev) =>
      Math.min(prev + 1, orgAdvisers.length - visibleCount)
    );
  }, [visibleCount]);

  // Keyboard nav effect
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, handlePrev]);

  const translateX = startIndex * (cardWidth + cardGap);

  return (
    <section className={styles.orgAdviserSection}>
      <div className={styles.orgAdviserHeading}>
        <h2 className={styles.orgAdviserTitle}>Meet Our Department Advisers</h2>
      </div>

      <div className={styles.orgAdviserCarousel}>
        <button
          className={styles.orgAdviserNavBtn}
          onClick={handlePrev}
          disabled={startIndex === 0}
          aria-label="Scroll Left"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.orgAdviserSliderWrapper}>
          <div
            className={styles.orgAdviserSliderTrack}
            style={{ transform: `translateX(-${translateX}px)` }}
          >
            {orgAdvisers.map((adviser, index) => (
              <div className={styles.orgAdviserCard} key={index}>
                <div className={styles.orgAdviserPhotoWrapper} style={{ position: 'relative' }}>
                  <Image
                    src={adviser.image}
                    alt={adviser.name}
                    className={styles.orgAdviserImage}
                    fill
                    sizes="(max-width: 640px) 220px, 240px"
                  />
                  <div className={styles.orgAdviserOverlay}>
                    <a
                      href={adviser.facebook}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.orgAdviserIcon}
                    >
                      <FaFacebookF />
                    </a>
                    <button className={`${styles.orgAdviserIcon} ${styles.orgAdviserMainIcon}`}>
                      <FaPlus />
                    </button>
                    <a href={`mailto:${adviser.email}`} className={styles.orgAdviserIcon}>
                      <FaEnvelope />
                    </a>
                  </div>
                </div>
                <p className={styles.orgAdviserName}>{adviser.name}</p>
                <p className={styles.orgAdviserRole}>{adviser.role}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.orgAdviserNavBtn}
          onClick={handleNext}
          disabled={startIndex >= orgAdvisers.length - visibleCount}
          aria-label="Scroll Right"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}