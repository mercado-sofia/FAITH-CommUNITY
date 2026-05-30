'use client';

import { useRef, useState, useEffect } from 'react';
import styles from './OrgHeadsCarousel.module.css';
import Image from 'next/image';
import { FaFacebookF, FaEnvelope, FaPlus } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveDisplayImageUrl, isUnavailableImage } from '@/utils/shared/uploadPaths';
import { SAMPLE_HEAD_PHOTOS } from '@/data/assets';
import { UnavailableImagePlaceholder } from '@/components';
import { useFadeIn } from '@/hooks/(public)/useFadeIn';

export default function OrgHeadsCarousel({ heads }) {
  const scrollRef = useRef(null);
  const [disableLeft, setDisableLeft] = useState(true);
  const [disableRight, setDisableRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    setDisableLeft(el.scrollLeft === 0);
    setDisableRight(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });
    setTimeout(checkScroll, 300);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll(); // Check on load
    el.addEventListener('scroll', checkScroll);

    return () => el.removeEventListener('scroll', checkScroll);
  }, []);

  const { ref: sectionRef, isVisible: isSectionVisible } = useFadeIn();
  const { ref: headingRef, isVisible: isHeadingVisible } = useFadeIn();
  const { ref: carouselRef, isVisible: isCarouselVisible } = useFadeIn({ rootMargin: '0px 0px -100px 0px' });

  return (
    <section ref={sectionRef} className={`${styles.orgheadsSection} ${isSectionVisible ? styles.fadeIn : ''}`}>
      <div className={styles.orgheadsWrapper}>
        <div ref={headingRef} className={`${styles.orgheadsText} ${isHeadingVisible ? styles.fadeIn : ''}`}>
          <p>Organization Heads</p>
          <h2>Meet The<br />Organization Heads</h2>
        </div>

        <div ref={carouselRef} className={`${styles.orgheadsCarousel} ${isCarouselVisible ? styles.fadeIn : ''}`}>
          {heads.length >= 4 && (
            <button
              onClick={scrollLeft}
              className={styles.orgheadsNavBtn}
              disabled={disableLeft}
            >
              <ChevronLeft />
            </button>
          )}

          <div className={styles.carouselWindow}>
            <div ref={scrollRef} className={styles.orgheadsCards}>
              {heads.length ? (
                heads.map((head, i) => (
                  <div key={i} className={styles.orgheadsWrapperItem}>
                    <div className={styles.imageContainer}>
                      {head.photo ? (
                        (() => {
                          const headImageUrl = resolveDisplayImageUrl(head.photo, {
                            kind: 'head',
                            fallback: SAMPLE_HEAD_PHOTOS[0],
                          });
                          if (isUnavailableImage(headImageUrl)) {
                            return (
                              <UnavailableImagePlaceholder 
                                width="240px" 
                                height="280px" 
                                text="Photo Unavailable"
                                className={styles.headImage}
                              />
                            );
                          }
                          return (
                            <Image
                              src={headImageUrl}
                              alt={head.head_name || head.name || 'Organization Head'}
                              width={240}
                              height={280}
                              className={styles.headImage}
                              onError={(e) => {
                                e.target.src = SAMPLE_HEAD_PHOTOS[0];
                              }}
                            />
                          );
                        })()
                      ) : (
                        <UnavailableImagePlaceholder 
                          width="240px" 
                          height="280px" 
                          text="No Photo"
                          className={styles.headImage}
                        />
                      )}
                      <div className={styles.iconBar}>
                        {head.facebook && (
                          <a href={head.facebook} target="_blank" rel="noreferrer" className={styles.iconBtn}>
                            <FaFacebookF />
                          </a>
                        )}
                        <button className={`${styles.iconBtn} ${styles.plusBtn}`}>
                          <FaPlus />
                        </button>
                        {head.email && (
                          <a href={`mailto:${head.email}`} className={styles.iconBtn}>
                            <FaEnvelope />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className={styles.orgheadsTextInfo}>
                      <h4>{head.head_name || head.name || 'Organization Head'}</h4>
                      <p>{head.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>No org heads listed.</p>
              )}
            </div>
          </div>

          {heads.length >= 4 && (
            <button
              onClick={scrollRight}
              className={styles.orgheadsNavBtn}
              disabled={disableRight}
            >
              <ChevronRight />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}