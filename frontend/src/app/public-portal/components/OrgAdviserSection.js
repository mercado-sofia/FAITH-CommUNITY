'use client';

import { useState, useEffect } from 'react';
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
  {
    name: "Jana Mae A. Cruz",
    role: "Dean",
    image: "/id/id5.jpg",
    facebook: "#",
    email: "org1@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Chair",
    image: "/id/id1.jpg",
    facebook: "#",
    email: "org2@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Org Adviser",
    image: "/id/id2.jpg",
    facebook: "#",
    email: "org3@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Org Adviser",
    image: "/id/id3.jpg",
    facebook: "#",
    email: "org4@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Dean",
    image: "/id/id5.jpg",
    facebook: "#",
    email: "org1@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Chair",
    image: "/id/id1.jpg",
    facebook: "#",
    email: "org2@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Org Adviser",
    image: "/id/id2.jpg",
    facebook: "#",
    email: "org3@email.com",
  },
  {
    name: "Jana Mae A. Cruz",
    role: "Org Adviser",
    image: "/id/id3.jpg",
    facebook: "#",
    email: "org4@email.com",
  },
];

export default function OrgAdviserSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const cardWidth = 240;
  const cardGap = 24;

  // Responsive visible count
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 600) setVisibleCount(1);
      else if (window.innerWidth < 900) setVisibleCount(2);
      else if (window.innerWidth < 1200) setVisibleCount(3);
      else setVisibleCount(4);
    };
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' && startIndex < orgAdvisers.length - visibleCount) {
        setStartIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && startIndex > 0) {
        setStartIndex((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [startIndex, visibleCount]);

  const handlePrev = () => {
    if (startIndex > 0) setStartIndex(startIndex - 1);
  };

  const handleNext = () => {
    if (startIndex < orgAdvisers.length - visibleCount) {
      setStartIndex(startIndex + 1);
    }
  };

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
            style={{ transform: `translateX(-${startIndex * (cardWidth + cardGap)}px)` }}
          >
            {orgAdvisers.map((adviser, index) => (
              <div className={styles.orgAdviserCard} key={index}>
                <div className={styles.orgAdviserPhotoWrapper}>
                  <Image
                    src={adviser.image}
                    alt={adviser.name}
                    width={240}
                    height={240}
                    className={styles.orgAdviserImage}
                  />
                  <div className={styles.orgAdviserOverlay}>
                    <a href={adviser.facebook} target="_blank" rel="noreferrer" className={styles.orgAdviserIcon}>
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