'use client';

import { useEffect, useRef, useState } from "react";
import styles from "./scroll.module.css";

export default function ScrollAnimationPage() {
  const nextRef = useRef(null);
  const bottomRef = useRef(null);
  const [scrollY, setScrollY] = useState(0);
  const [active, setActive] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    // Find the scroll container (public-content-container)
    const scrollContainer = document.querySelector('.public-content-container');
    if (!scrollContainer) return;

    // Set initial window height
    if (typeof window !== 'undefined') {
      setWindowHeight(window.innerHeight);
    }

    // Parallax scroll handler
    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      setScrollY(scrollTop);
      
      // Trigger active state when scrolled past hero section
      const viewportHeight = window.innerHeight || windowHeight;
      if (scrollTop > viewportHeight * 0.3) {
        setActive(true);
      } else {
        setActive(false);
      }
    };

    // Handle window resize
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setWindowHeight(window.innerHeight);
      }
    };

    // Observer for the next section (overlaps hero)
    const nextObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Trigger when section is 10% visible for smoother animation
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            setActive(true);
          }
        });
      },
      {
        root: scrollContainer,
        rootMargin: '0px',
        threshold: [0, 0.1, 0.2, 0.5, 1],
      }
    );

    // Add event listeners
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    handleScroll(); // Initial call

    // Observe next section
    if (nextRef.current) {
      nextObserver.observe(nextRef.current);
    }

    // Cleanup
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      nextObserver.disconnect();
    };
  }, [windowHeight]);

  return (
    <main className={styles.main}>
      <section
        className={`${styles.hero} ${active ? styles.heroHidden : ""}`}
        aria-hidden={active}
      >
        <div className={styles.heroInner}>
          <h1 className={styles.title}>Welcome to Our Site</h1>
          <p className={styles.subtitle}>Scroll to see the animation</p>
        </div>
      </section>

      {/* The next section is placed *over* the hero by using negative margin
          so it visually covers the hero as it becomes active */}
      <section
        ref={nextRef}
        className={`${styles.next} ${active ? styles.nextActive : ""}`}
      >
        <div className={styles.nextInner}>
          <h2>Scroll Animation Active</h2>
          <p>This section overshadows the hero as you scroll</p>
        </div>
      </section>

      {/* Parallax container - moves to top on scroll */}
      <section 
        ref={bottomRef}
        className={styles.bottom}
        style={{
          transform: `translateY(${Math.max(0, scrollY - (windowHeight || 0))}px)`,
        }}
      >
        <div>
          <h3>More Content</h3>
          <p>Keep scrolling — this proves the parallax behavior.</p>
        </div>
      </section>
    </main>
  );
}
