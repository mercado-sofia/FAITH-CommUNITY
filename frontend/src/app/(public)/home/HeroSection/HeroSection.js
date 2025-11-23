'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { FaPlay } from 'react-icons/fa';
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

  // Filter images to only include those with valid URLs
  const validImages = useMemo(() => {
    return heroData?.images?.filter(image => image.url) || [];
  }, [heroData?.images]);

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


  // Check user authentication status
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      // Check authentication using the auth service instead of localStorage
      try {
        const { getCurrentUser } = await import('@/utils/authService');
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        // User is not authenticated
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-cycling carousel effect for mobile
  useEffect(() => {
    if (!validImages || validImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => 
        (prevIndex + 1) % validImages.length
      );
    }, 4000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [validImages]);

  // Reset carousel index when valid images change
  useEffect(() => {
    if (currentImageIndex >= validImages.length && validImages.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [validImages, currentImageIndex]);

  useEffect(() => {
    if (typeof document !== 'undefined' && document.body) {
      if (showVideo) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [showVideo]);

  // Handle ESC key to close video
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
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
                    // Always navigate to /apply page
                    router.push("/apply");
                    // Show modal if not logged in
                    if (!isLoggedIn && typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('showLoginModal'));
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
                    <FaPlay className={styles.playIcon} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            {/* Desktop Card Layout */}
            <div className={styles.desktopCards}>
              {validImages.map((image, index) => {
                const isFirst = index === 0;
                
                return (
                  <div key={image.id} className={`${styles.card} ${isFirst ? styles.first : styles.cardVertical}`}>
                    <Image
                      src={image.url}
                      alt={isFirst ? "Main Card" : `Vertical Card ${index}`}
                      width={isFirst ? 880 : 360}
                      height={1120}
                      className={styles.cardImage}
                      quality={100}
                      sizes={isFirst ? "(max-width: 1300px) 720px, 880px" : "(max-width: 1300px) 360px, 360px"}
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
              {validImages.length > 0 && validImages[currentImageIndex] && (
                <div className={styles.carouselContainer}>
                  <Image
                    src={validImages[currentImageIndex].url}
                    alt={`Carousel Image ${currentImageIndex + 1}`}
                    width={1920}
                    height={1080}
                    className={styles.carouselImage}
                    quality={100}
                    sizes="(max-width: 640px) 640px, (max-width: 1270px) 1280px, 1920px"
                    priority
                  />
                  <div className={styles.carouselOverlay}>
                    <h2>{validImages[currentImageIndex]?.heading || "Community Impact"}</h2>
                    <p>{validImages[currentImageIndex]?.subheading || "Making a difference together"}</p>
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className={styles.carouselIndicators}>
                    {validImages.map((_, index) => (
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