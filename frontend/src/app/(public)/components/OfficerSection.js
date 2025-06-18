'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '../styles/OfficerSection.module.css';
import {
  FaChevronLeft,
  FaChevronRight,
  FaFacebookF,
  FaEnvelope,
  FaPlus,
} from 'react-icons/fa';

const officers = [
  {
    name: "Jana Mae A. Cruz",
    role: "Dean",
    image: "/id/id2.jpg",
    facebook: "#",
    email: "dean@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Chair",
    image: "/id/id4.jpg",
    facebook: "#",
    email: "chair@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Org Adviser",
    image: "/id/id1.jpg",
    facebook: "#",
    email: "adviser@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Secretary",
    image: "/id/id5.jpg",
    facebook: "#",
    email: "secretary@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Dean",
    image: "/id/id2.jpg",
    facebook: "#",
    email: "dean@email.com",
  },
];

export default function OfficerSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const [cardWidth, setCardWidth] = useState(280);
  const [cardGap, setCardGap] = useState(24);

  useEffect(() => {
    const updateResponsive = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setVisibleCount(1);
        setCardWidth(220);
        setCardGap(16);
      } else if (width < 964) {
        setVisibleCount(2);
        setCardWidth(240);
        setCardGap(20);
      } else if (width < 1160) {
        setVisibleCount(3);
        setCardWidth(280);
        setCardGap(24);
      } else {
        setVisibleCount(3);
        setCardWidth(280);
        setCardGap(24);
      }
    };

    updateResponsive();
    window.addEventListener('resize', updateResponsive);
    return () => window.removeEventListener('resize', updateResponsive);
  }, []);

  const handlePrev = useCallback(() => {
    setStartIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setStartIndex((prev) => Math.min(prev + 1, officers.length - visibleCount));
  }, [visibleCount]);

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
    <section className={styles.officerSection}>
      <div className={styles.officerHeading}>
        <p className={styles.officerSubtitle}>Head Advisers & Officers</p>
        <h2 className={styles.officerTitle}>Meet Our Community Extension Committee</h2>
      </div>

      <div className={styles.officerCarousel}>
        <button
          className={styles.officerNavBtn}
          onClick={handlePrev}
          disabled={startIndex === 0}
          aria-label="Scroll Left"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.officerSliderWrapper}>
          <div
            className={styles.officerSliderTrack}
            style={{ transform: `translateX(-${translateX}px)` }}
          >
            {officers.map((officer, index) => (
              <div className={styles.officerCard} key={index}>
              <div className={styles.officerPhotoWrapper}>
                <Image
                  src={officer.image}
                  alt={officer.name}
                  fill
                  className={styles.officerImage}
                  sizes="(max-width: 640px) 220px, (max-width: 964px) 240px, (max-width: 1160px) 280px, 280px"
                />
                <div className={styles.officerOverlay}>
                  <a href={officer.facebook} target="_blank" rel="noreferrer" className={styles.officerIcon}>
                    <FaFacebookF />
                  </a>
                  <button className={`${styles.officerIcon} ${styles.officerMainIcon}`}>
                    <FaPlus />
                  </button>
                  <a href={`mailto:${officer.email}`} className={styles.officerIcon}>
                    <FaEnvelope />
                  </a>
                </div>
              </div>
                <p className={styles.officerName}>{officer.name}</p>
                <p className={styles.officerRole}>{officer.role}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.officerNavBtn}
          onClick={handleNext}
          disabled={startIndex >= officers.length - visibleCount}
          aria-label="Scroll Right"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}