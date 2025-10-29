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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Fetch hero section data
  const { heroData } = usePublicHeroSection();

  // Helper function to convert YouTube URLs to embed format
  const convertToEmbedUrl = (url) => {
    if (url.includes('youtube.com/watch')) {
      const videoId = url.match(/[?&]v=([^&]+)/);
      if (videoId) return `https://www.youtube.com/embed/${videoId[1]}`;
    } else if (url.includes('youtu.be/')) {
      const videoId = url.match(/youtu\.be\/([^?&]+)/);
      if (videoId) return `https://www.youtube.com/embed/${videoId[1]}`;
    } else if (url.includes('vimeo.com/')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/);
      if (videoId) return `https://player.vimeo.com/video/${videoId[1]}`;
    }
    return url;
  };

  // Helper function to get fallback image
  const getFallbackImage = (index) => {
    const fallbacks = ["/samples/sample2.jpg", "/samples/sample8.jpg", "/samples/sample3.jpeg"];
    return fallbacks[index] || fallbacks[0];
  };

  // Check user authentication status
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      
      if (token && storedUserData) {
        try {
          JSON.parse(storedUserData);
          setIsLoggedIn(true);
        } catch (error) {
          // Clear corrupted data using centralized cleanup
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
        }
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-cycling carousel effect for mobile
  useEffect(() => {
    if (!heroData?.images || heroData.images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % heroData.images.length
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [heroData?.images]);

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

  // Handle ESC key to close video
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showVideo) {
        setShowVideo(false);
      }
    };

    if (showVideo) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
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
            {/* Desktop Card Layout */}
            <div className={styles.desktopCards}>
              {heroData?.images?.map((image, index) => {
                const isFirst = index === 0;
                const imageSrc = image.url || getFallbackImage(index);
                
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

            {/* Mobile Carousel */}
            <div className={styles.mobileCarousel}>
              {heroData?.images && heroData.images.length > 0 && (
                <div className={styles.carouselContainer}>
                  <Image
                    src={heroData.images[currentImageIndex]?.url || getFallbackImage(currentImageIndex)}
                    alt={`Carousel Image ${currentImageIndex + 1}`}
                    width={400}
                    height={300}
                    className={styles.carouselImage}
                    priority
                  />
                  <div className={styles.carouselOverlay}>
                    <h2>{heroData.images[currentImageIndex]?.heading || "Community Impact"}</h2>
                    <p>{heroData.images[currentImageIndex]?.subheading || "Making a difference together"}</p>
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className={styles.carouselIndicators}>
                    {heroData.images.map((_, index) => (
                      <button
                        key={index}
                        className={`${styles.indicator} ${index === currentImageIndex ? styles.active : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                        aria-label={`Go to image ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showVideo && mounted && (heroData?.video_url || heroData?.video_link) && createPortal(
        <div 
          className={styles.videoOverlay}
          onClick={(e) => {
            // Close video when clicking on overlay (not on video itself)
            if (e.target === e.currentTarget) {
              setShowVideo(false);
            }
          }}
        >
          <button className={styles.closeButton} onClick={() => setShowVideo(false)}>✖</button>
          {heroData?.video_link ? (
            <iframe
              src={convertToEmbedUrl(heroData.video_link)}
              className={styles.videoPlayer}
              frameBorder="0"
              allowFullScreen
              title="Hero Video"
            />
          ) : (
            <video 
              controls 
              autoPlay 
              className={styles.videoPlayer}
              onError={(e) => {
                setShowVideo(false);
              }}
            >
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