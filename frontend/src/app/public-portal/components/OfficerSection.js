'use client';

import { useState, useEffect } from 'react';
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
  const [officerStart, setOfficerStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const cardWidth = 280;
  const cardGap = 24;

  // Handle window resize for responsive visible count
  useEffect(() => {
    const updateVisibleCount = () => {
      if (window.innerWidth < 600) setVisibleCount(1);
      else if (window.innerWidth < 900) setVisibleCount(2);
      else setVisibleCount(3);
    };
    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' && officerStart < officers.length - visibleCount) {
        setOfficerStart((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && officerStart > 0) {
        setOfficerStart((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [officerStart, visibleCount]);

  const handlePrev = () => {
    if (officerStart > 0) setOfficerStart(officerStart - 1);
  };

  const handleNext = () => {
    if (officerStart < officers.length - visibleCount) {
      setOfficerStart(officerStart + 1);
    }
  };

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
          disabled={officerStart === 0}
          aria-label="Scroll Left"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.officerSliderWrapper}>
          <div
            className={styles.officerSliderTrack}
            style={{ transform: `translateX(-${officerStart * (cardWidth + cardGap)}px)` }}
          >
            {officers.map((officer, index) => (
              <div className={styles.officerCard} key={index}>
                <div className={styles.officerPhotoWrapper}>
                  <Image
                    src={officer.image}
                    alt={officer.name}
                    width={240}
                    height={240}
                    className={styles.officerImage}
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
          disabled={officerStart >= officers.length - visibleCount}
          aria-label="Scroll Right"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}