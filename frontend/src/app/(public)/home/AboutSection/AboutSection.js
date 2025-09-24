'use client';

import styles from './AboutSection.module.css';
import Image from 'next/image';
import { FaCheck } from 'react-icons/fa';
import { usePublicAboutUs } from '../../hooks/usePublicData';
import Loader from '../../../../components/Loader';

export default function AboutSection() {
  const { aboutUsData, isLoading, error } = usePublicAboutUs();

  if (isLoading) {
    return (
      <section className={styles.aboutSection}>
        <div className={styles.wrapper}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader small />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.error('Error loading about us data:', error);
  }

  return (
    <section className={styles.aboutSection}>
      <div className={styles.wrapper}>
        <div className={styles.aboutWrapper}>
          <div className={styles.aboutImageWrapper}>
            <Image
              src="/sample/sample1.jpg"
              alt="Teacher and student"
              width={700}
              height={500}
              className={styles.aboutImage}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 1300px) 100vw, 700px"
            />
          </div>

          <div className={styles.aboutContent}>
            <p className={styles.aboutLabel}>{aboutUsData?.tag || 'About Us FAITH CommUNITY'}</p>
            <h2 className={styles.aboutHeading}>{aboutUsData?.heading || 'We Believe That We Can Help More People With You'}</h2>
            <p className={styles.aboutParagraph}>
              {aboutUsData?.description || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'}
            </p>
            
            {/* Extension Categories List */}
            <div className={styles.extensionCategories}>
              {aboutUsData?.extension_categories?.map((category, index) => (
                <div key={index} className={styles.extensionCategory}>
                  <FaCheck className={styles.checkIcon} style={{ 
                    color: category.color === 'green' ? '#10b981' : 
                           category.color === 'red' ? '#ef4444' : 
                           category.color === 'orange' ? '#f97316' : 
                           category.color === 'blue' ? '#3b82f6' :
                           category.color === 'purple' ? '#8b5cf6' :
                           category.color === 'yellow' ? '#f59e0b' :
                           category.color === 'pink' ? '#ec4899' :
                           category.color === 'teal' ? '#14b8a6' :
                           category.color === 'indigo' ? '#6366f1' :
                           category.color === 'gray' ? '#6b7280' :
                           category.color === 'emerald' ? '#10b981' :
                           category.color === 'rose' ? '#f43f5e' :
                           category.color === 'cyan' ? '#06b6d4' :
                           category.color === 'lime' ? '#84cc16' :
                           category.color === 'amber' ? '#f59e0b' : '#3b82f6' 
                  }} />
                  <span>{category.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}