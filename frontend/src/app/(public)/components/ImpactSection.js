'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './styles/ImpactSection.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LuCalendarCheck2 } from "react-icons/lu";
import { useGetPublicFeaturedProjectsQuery } from '@/rtk/(public)/featuredProjectsApi';



export default function ImpactSection() {
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(2);
  const [cardWidth, setCardWidth] = useState(480);
  const [cardGap, setCardGap] = useState(24);
  const [isClient, setIsClient] = useState(false);

  // Fetch featured projects from API
  const { 
    data: featuredProjects = [], 
    isLoading, 
    error 
  } = useGetPublicFeaturedProjectsQuery();

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

  // Transform featured projects data to match the expected format
  const transformedFeaturedProjects = featuredProjects.map(project => ({
    image: project.image ? 
      (project.image.startsWith('data:') ? project.image : `http://localhost:8080/uploads/programs/${project.image}`) 
      : '/sample/sample1.jpg',
    title: project.title || 'Featured Project',
    date: project.completedDate ? new Date(project.completedDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) : 'Coming Soon',
    description: project.description || 'An amazing project making a difference in the community.',
    organization: project.orgAcronym || 'FAITH',
    orgColor: project.orgColor || '#444444'
  }));

  // Use only the transformed featured projects data
  const dataToDisplay = transformedFeaturedProjects;

  const handleNext = useCallback(() => {
    setStartIndex((prev) =>
      Math.min(prev + 1, dataToDisplay.length - visibleCount)
    );
  }, [visibleCount, dataToDisplay]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, handlePrev]);

  const translateX = startIndex * (cardWidth + cardGap);

  if (!isClient || isLoading) {
    return (
      <section className={styles.impactSection}>
        <div className={styles.loaderWrapper}>
          <div className={styles.loader}></div>
        </div>
      </section>
    );
  }

  // If there are no featured projects, don't render the section
  if (error || dataToDisplay.length === 0) {
    return null;
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
            {dataToDisplay.map((card, index) => (
              <div
                key={index}
                className={styles.cardImpact}
                style={{ width: `${cardWidth}px` }}
              >
              <div className={styles.imageContainer}>
                {card.image.startsWith('data:') ? (
                  <img
                    src={card.image}
                    alt={card.title}
                    className={styles.impactcardImg}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className={styles.impactcardImg}
                    sizes="(max-width: 740px) 250px, (max-width: 980px) 275px, (max-width: 1200px) 400px, 480px"
                  />
                )}
                <div
                  className={styles.orgLabelOverlay}
                  style={{ '--bgColor': card.orgColor }}
                >
                  {card.organization}
                </div>
              </div>
                <h3 className={styles.impactcardTitle}>{card.title}</h3>
                <p className={styles.impactdate}>
                  <LuCalendarCheck2 className={styles.impactcalendarIcon} />
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
          disabled={startIndex >= dataToDisplay.length - visibleCount}
          aria-label="Scroll Right"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}