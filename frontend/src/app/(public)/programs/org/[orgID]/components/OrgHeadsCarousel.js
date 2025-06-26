'use client';

import { useRef } from 'react';
import styles from '../../org.module.css';
import Image from 'next/image';
import { FaFacebookF, FaEnvelope, FaPlus } from 'react-icons/fa';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function OrgHeadsCarousel({ heads }) {
  const scrollRef = useRef(null);

  const scrollLeft = () => scrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' });
  const scrollRight = () => scrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' });

  return (
    <section className={styles.orgheadsSection}>
      <div className={styles.orgheadsWrapper}>
        <div className={styles.orgheadsText}>
          <p>Organization Heads</p>
          <h2>Meet The<br />Organization Heads</h2>
        </div>

        <div className={styles.orgheadsCarousel}>
          <button onClick={scrollLeft} className={styles.orgheadsNavBtn}><ChevronLeft /></button>
          <div className={styles.carouselWindow}>
            <div ref={scrollRef} className={styles.orgheadsCards}>
              {heads.length ? (
                heads.map((head, i) => (
                  <div key={i} className={styles.orgheadsWrapperItem}>
                    <div className={styles.imageContainer}>
                      <Image
                        src={head.photo}
                        alt={head.name}
                        width={240}
                        height={280}
                        className={styles.headImage}
                      />
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
                      <h4>{head.name}</h4>
                      <p>{head.role}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={styles.noData}>No org heads listed.</p>
              )}
            </div>
          </div>
          <button onClick={scrollRight} className={styles.orgheadsNavBtn}><ChevronRight /></button>
        </div>
      </div>
    </section>
  );
}