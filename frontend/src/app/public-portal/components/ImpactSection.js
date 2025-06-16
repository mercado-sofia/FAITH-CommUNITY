'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/ImpactSection.module.css';
import Image from 'next/image';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function ImpactSection() {
  const [impactStart, setImpactStart] = useState(0);
  const [visibleCount, setVisibleCount] = useState(3);
  const cardWidth = 275;
  const cardGap = 24;

  const impactCards = [
    {
      image: "/sample/sample6.jpg",
      title: "Poultry Farming Myths You Should Stop Believing",
      date: "April 10, 2025",
      description: "Common myths about poultry farming and the real facts behind them."
    },
    {
      image: "/sample/sample7.jpg",
      title: "The Benefits of Buying Directly from Local Farms",
      date: "April 15, 2025",
      description: "Supporting local farmers builds a stronger, healthier community."
    },
    {
      image: "/sample/sample8.jpg",
      title: "Feeding Practices That Keep Our Birds Strong",
      date: "April 20, 2025",
      description: "A look into nutrition programs that ensure healthy livestock."
    },
    {
      image: "/sample/sample1.jpg",
      title: "Sustaining Growth Through Education Programs",
      date: "April 25, 2025",
      description: "Educational outreach programs that changed lives in the community."
    },
    {
      image: "/sample/sample6.jpg",
      title: "Poultry Farming Myths You Should Stop Believing",
      date: "April 10, 2025",
      description: "Common myths about poultry farming and the real facts behind them."
    },
    {
      image: "/sample/sample7.jpg",
      title: "The Benefits of Buying Directly from Local Farms",
      date: "April 15, 2025",
      description: "Supporting local farmers builds a stronger, healthier community."
    },
  ];

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

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' && impactStart < impactCards.length - visibleCount) {
        setImpactStart((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && impactStart > 0) {
        setImpactStart((prev) => prev - 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [impactStart, visibleCount, impactCards.length]);

  return (
    <section className={styles.impactSection}>
      <div className={styles.wrapper}>
        <div className={styles.impactheading}>
          <p className={styles.subtitle}>Extension Programs</p>
          <h2 className={styles.impacttitle}>
            See The Impact: How do you want to <br /> make a difference?
          </h2>
        </div>

        <div className={styles.carousel}>
          <button
            className={styles.impactnavBtn}
            onClick={() => impactStart > 0 && setImpactStart(impactStart - 1)}
            disabled={impactStart === 0}
            aria-label="Scroll Left"
          >
            <FaChevronLeft />
          </button>

          <div className={styles.impactsliderWrapper}>
            <div
              className={styles.impactsliderTrack}
              style={{
                transform: `translateX(-${impactStart * (cardWidth + cardGap)}px)`
              }}
            >
              {impactCards.map((card, index) => (
                <div className={styles.cardImpact} key={index}>
                  <Image
                    src={card.image}
                    alt={card.title}
                    className={styles.impactcardImg}
                    width={300}
                    height={200}
                    priority={index === 0}
                  />
                  <h3 className={styles.impactcardTitle}>{card.title}</h3>
                  <p className={styles.impactdate}>
                    <FaCalendarAlt className={styles.impactcalendarIcon} /> {card.date}
                  </p>
                  <p className={styles.impactdesc}>{card.description}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            className={styles.impactnavBtn}
            onClick={() => {
              if (impactStart < impactCards.length - visibleCount) {
                setImpactStart(impactStart + 1);
              }
            }}
            disabled={impactStart >= impactCards.length - visibleCount}
            aria-label="Scroll Right"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}