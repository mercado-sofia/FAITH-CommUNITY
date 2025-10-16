'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './BannerSection.module.css';

export default function BannerSection() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

  return (
    <section className={styles.inviteSection}>
      <div className={styles.overlay} />

      <div className={styles.wrapper}>
        <div className={styles.inviteContent}>
          <h2 className={styles.inviteHeading}>
            The Doors <span className={styles.orange}>Are Always Open</span> To<br />
            More People Who Want To <span className={styles.green}>Help</span> Each Other!
          </h2>
          <button className={styles.inviteBtn} onClick={() => {
            if (!isLoggedIn) {
              window.dispatchEvent(new CustomEvent('showLoginModal'));
            } else {
              router.push("/apply");
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