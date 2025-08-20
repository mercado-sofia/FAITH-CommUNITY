'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import styles from './styles/HeroSection.module.css';

export default function HeroSection() {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
            <p className={styles.welcome}>Welcome to FAITH CommUNITY</p>
            <h1 className={styles.herotitle}>
              A Unified Platform for Community Extension Programs
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

                <div className={styles.playCircle} onClick={() => setShowVideo(true)}>
                  <span className={styles.playIcon}>▶</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div className={`${styles.card} ${styles.first}`}>
              <Image
                src="/sample/sample2.jpg"
                alt="Main Card"
                width={280}
                height={180}
                className={styles.cardImage}
                priority
              />
              <div className={styles.cardText}>
                <h2>Inside the Initiative</h2>
                <p>Where Ideas Take Root</p>
              </div>
            </div>
            <div className={styles.cardVertical}>
              <Image
                src="/sample/sample8.jpg"
                alt="Vertical Card 1"
                width={280}
                height={340}
                className={styles.cardImage}
                priority
              />
              <div className={styles.cardOverlayText}>Project Snapshot</div>
            </div>
            <div className={styles.cardVertical}>
              <Image
                src="/sample/sample3.jpeg"
                alt="Vertical Card 2"
                width={280}
                height={340}
                className={styles.cardImage}
                priority
              />
              <div className={styles.cardOverlayText}>Extension in Action</div>
            </div>
          </div>
        </div>
      </div>

      {showVideo && mounted && createPortal(
        <div className={styles.videoOverlay}>
          <button className={styles.closeButton} onClick={() => setShowVideo(false)}>✖</button>
          <video controls autoPlay className={styles.videoPlayer}>
            <source src="/video/sample_video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>,
        document.body
      )}
    </section>
  );
}