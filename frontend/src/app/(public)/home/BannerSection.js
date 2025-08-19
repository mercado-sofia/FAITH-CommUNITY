'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles/BannerSection.module.css';

export default function BannerSection() {
  const router = useRouter();
  const imageRef = useRef(null);

useEffect(() => {
  const handleScroll = () => {
    const section = document.querySelector(`.${styles.inviteSection}`);
    if (!imageRef.current || !section) return;

    const sectionTop = section.getBoundingClientRect().top;
    const sectionHeight = section.offsetHeight;

    if (sectionTop < window.innerHeight && sectionTop + sectionHeight > 0) {
      const scrollY = window.scrollY;
      const translateY = scrollY * 0.5;
      imageRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);


  return (
    <section
      className={styles.inviteSection}
      style={{ backgroundImage: "url('/sample/sample4.jpg')" }}
    >
      <div className={styles.overlay} />

      <div className={styles.wrapper}>
        <div className={styles.inviteContent}>
          <h2 className={styles.inviteHeading}>
            The Doors <span className={styles.orange}>Are Always Open</span> To<br />
            More People Who Want To <span className={styles.green}>Help</span> Each Other!
          </h2>
          <button className={styles.inviteBtn} onClick={() => router.push("/apply")}>
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