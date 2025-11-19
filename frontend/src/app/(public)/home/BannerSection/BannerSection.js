'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BannerSection.module.css';
import { useFadeIn } from '../../hooks/useFadeIn';

export default function BannerSection() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { ref: sectionRef, isVisible: isSectionVisible } = useFadeIn();

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

  return (
    <section ref={sectionRef} className={`${styles.inviteSection} ${isSectionVisible ? styles.fadeIn : ''}`}>
      <div className={styles.overlay} />

      <div className={styles.wrapper}>
        <div className={styles.inviteContent}>
          <h2 className={styles.inviteHeading}>
            The Doors <span className={styles.orange}>Are Always Open</span> To<br />
            More People Who Want To <span className={styles.green}>Help</span> Each Other!
          </h2>
          <button className={styles.inviteBtn} onClick={() => {
            // Always navigate to /apply page
            router.push("/apply");
            // Show modal if not logged in
            if (!isLoggedIn && typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('showLoginModal'));
            }
          }}>
            Get Involved
                <span className={styles.arrow}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path
                      d="M4.375 10.625L10.625 4.375M10.625 4.375H4.375M10.625 4.375V10.625"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
          </button>
        </div>
      </div>
    </section>
  );
}