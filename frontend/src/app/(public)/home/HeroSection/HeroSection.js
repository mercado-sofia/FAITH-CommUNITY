'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './HeroSection.module.css';
import { usePublicHeroSection } from '../../hooks/usePublicData';

export default function HeroSection() {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Fetch hero section data
  const { heroData, isLoading, error } = usePublicHeroSection();

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        JSON.parse(storedUserData);
        setIsLoggedIn(true);
      } catch (error) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showVideo]);

  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>
        <div className={styles.heroWrapper}>
          <div className={styles.leftColumn}>
            <p className={styles.welcome}>{heroData?.tag || 'Welcome to FAITH CommUNITY'}</p>
            <h1 className={styles.herotitle}>
              {heroData?.heading || 'A Unified Platform for Community Extension Programs'}
            </h1>

            <div className={styles.ctaContainer}>
              <div className={styles.cta}>
                <span>Start Your Volunteer Journey</span>
                <button
                  className={styles.ctaButton}
                  onClick={() => {
                    if (!isLoggedIn) {
                      window.dispatchEvent(new CustomEvent('showLoginModal'));
                    } else {
                      router.push("/apply");
                    }
                  }}
                >
                  Apply Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M4.375 10.625L10.625 4.375M10.625 4.375H4.375M10.625 4.375V10.625" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <div className={styles.buttons}>
                <Link href="/programs" className={styles.discover}>
                  Discover Now
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M4.375 10.625L10.625 4.375M10.625 4.375H4.375M10.625 4.375V10.625" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>

                {(heroData?.video_url || heroData?.video_link) && (
                  <div className={styles.playCircle} onClick={() => setShowVideo(true)}>
                    <span className={styles.playIcon}>▶</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            {heroData?.images?.map((image, index) => {
              const isFirst = index === 0;
              const imageSrc = image.url || (isFirst ? "/samples/sample2.jpg" : index === 1 ? "/samples/sample8.jpg" : "/samples/sample3.jpeg");
              
              return (
                <div key={image.id} className={`${styles.card} ${isFirst ? styles.first : styles.cardVertical}`}>
                  <Image
                    src={imageSrc}
                    alt={isFirst ? "Main Card" : `Vertical Card ${index}`}
                    width={280}
                    height={isFirst ? 180 : 340}
                    className={styles.cardImage}
                    priority
                  />
                  {isFirst ? (
                    <div className={styles.cardText}>
                      <h2>{image.heading}</h2>
                      <p>{image.subheading}</p>
                    </div>
                  ) : (
                    <div className={styles.cardOverlayText}>
                      <h3>{image.heading}</h3>
                      <p>{image.subheading}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showVideo && mounted && (heroData?.video_url || heroData?.video_link) && createPortal(
        <div className={styles.videoOverlay}>
          <button className={styles.closeButton} onClick={() => setShowVideo(false)}>✖</button>
          {heroData?.video_type === 'link' ? (
            <iframe
              src={heroData.video_link}
              className={styles.videoPlayer}
              frameBorder="0"
              allowFullScreen
              title="Hero Video"
            />
          ) : (
            <video controls autoPlay className={styles.videoPlayer}>
              <source src={heroData.video_url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
        </div>,
        document.body
      )}
    </section>
  );
}