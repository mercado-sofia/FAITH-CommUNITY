'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '../styles/ImpactSection.module.css';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';

const impactCards = [
  {
    image: '/sample/sample6.jpg',
    title: 'Poultry Farming Myths You Should Stop Believing',
    date: '10 April 2025',
    description: 'Common myths about poultry farming and the real facts behind them.',
    organization: 'FACTS',
  },
  {
    image: '/sample/sample7.jpg',
    title: 'The Benefits of Buying Directly from Local Farms',
    date: '10 April 2025',
    description: 'Supporting local farmers builds a stronger, healthier community.',
    organization: 'JPIA',
  },
  {
    image: '/sample/sample8.jpg',
    title: 'Feeding Practices That Keep Our Birds Strong',
    date: '10 April 2025',
    description: 'A look into nutrition programs that ensure healthy livestock.',
    organization: 'FABCOMMS',
  },
  {
    image: '/sample/sample1.jpg',
    title: 'Sustaining Growth Through Education Programs',
    date: '10 April 2025',
    description: 'Educational outreach programs that changed lives in the community.',
    organization: 'FTL',
  },
  {
    image: '/sample/sample6.jpg',
    title: 'Poultry Farming Myths You Should Stop Believing',
    date: '10 April 2025',
    description: 'Common myths about poultry farming and the real facts behind them.',
    organization: 'JMAP',
  },
  {
    image: '/sample/sample7.jpg',
    title: 'The Benefits of Buying Directly from Local Farms',
    date: '10 April 2025',
    description: 'Supporting local farmers builds a stronger, healthier community.',
    organization: 'FAIPS',
  },
];

export default function ImpactSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);
  const [cardWidth, setCardWidth] = useState(480);
  const [cardGap, setCardGap] = useState(24);
  const [isClient, setIsClient] = useState(false);

  const updateResponsive = useCallback(() => {
    const width = window.innerWidth;

    if (width < 740) {
      setCardWidth(250);
      setCardGap(26);
      setVisibleCount(1);
    } else if (width < 980) {
      setCardWidth(275);
      setCardGap(26);
      setVisibleCount(2);
    } else if (width < 1200) {
      setCardWidth(400);
      setCardGap(26);
      setVisibleCount(2);
    } else {
      setCardWidth(480);
      setCardGap(24);
      setVisibleCount(2);
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    updateResponsive();
    window.addEventListener('resize', updateResponsive);
    return () => window.removeEventListener('resize', updateResponsive);
  }, [updateResponsive]);

  const handlePrev = useCallback(() => {
    setStartIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setStartIndex((prev) =>
      Math.min(prev + 1, impactCards.length - visibleCount)
    );
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

  function getRandomColor() {
    const colors = {
      FACTS: '#E70004',
      JPIA: '#FFB300',
      FABCOMMS: '#058C00',
      FTL: '#100DBE',
      JMAP: '#B40099',
      FAIPS: '#FFB300',
    };
    return (org) => colors[org] || '#444';
  }

  const getColor = getRandomColor();

  if (!isClient) {
    return (
      <section className={styles.impactSection}>
        <div className={styles.loaderWrapper}>
          <div className={styles.loader}></div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.impactSection}>
      <div className={styles.impactHeading}>
        <p className={styles.subtitle}>Extension Programs</p>
        <h2 className={styles.impactTitle}>
          See The Impact: How do you want to make a difference?
        </h2>
      </div>

      <div className={styles.impactCarousel}>
        <button
          className={styles.impactnavBtn}
          onClick={handlePrev}
          disabled={startIndex === 0}
          aria-label="Scroll Left"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.impactSliderWrapper}>
          <div
            className={styles.impactSliderTrack}
            style={{ transform: `translateX(-${translateX}px)` }}
          >
            {impactCards.map((card, index) => (
              <div
                key={index}
                className={styles.cardImpact}
                style={{ width: `${cardWidth}px` }}
              >
              <div className={styles.imageContainer}>
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  className={styles.impactcardImg}
                  sizes="(max-width: 740px) 250px, (max-width: 980px) 275px, (max-width: 1200px) 400px, 480px"
                />
                <div
                  className={styles.orgLabelOverlay}
                  style={{ '--bgColor': getColor(card.organization) }}
                >
                  {card.organization}
                </div>
              </div>
                <h3 className={styles.impactcardTitle}>{card.title}</h3>
                <p className={styles.impactdate}>
                  <FaCalendarAlt className={styles.impactcalendarIcon} />
                  {card.date}
                </p>
                <p className={styles.impactdesc}>{card.description}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          className={styles.impactnavBtn}
          onClick={handleNext}
          disabled={startIndex >= impactCards.length - visibleCount}
          aria-label="Scroll Right"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}