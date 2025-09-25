'use client';

import { memo } from 'react';
import styles from './AboutSection.module.css';
import Image from 'next/image';
import { FaHeart, FaCube } from 'react-icons/fa';
import { usePublicSiteName, usePublicMissionVision } from '../../hooks/usePublicData';

function AboutSection() {
  const { siteNameData } = usePublicSiteName();
  const { missionVisionData, isLoading: missionVisionLoading, error: missionVisionError } = usePublicMissionVision();

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
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          </div>

          <div className={styles.aboutContent}>
            <p className={styles.aboutLabel}>Who we are</p>
            <h2 className={styles.aboutHeading}>The Story Behind {siteNameData?.site_name || 'FAITH CommUNITY'}</h2>
            <p className={styles.aboutParagraph}>
              {siteNameData?.site_name || 'FAITH CommUNITY'} serves as a bridge between volunteers and organizations,
              created to support and document the shared efforts of the FAITH Colleges
              community in delivering meaningful outreach and service.
            </p>
            
            <div className={styles.aboutBoxes}>
              <div className={styles.missionbox}>
                <FaHeart className={styles.abouticon} />
                <h3>Our Mission</h3>
                <p>
                  {missionVisionLoading ? 'Loading mission...' : 
                   missionVisionError ? 'Unable to load mission statement.' :
                   missionVisionData?.mission || 'To serve communities through education and engagement, fostering growth and development for a better tomorrow.'}
                </p>
              </div>
              <div className={styles.visionbox}>
                <FaCube className={styles.abouticon} />
                <h3>Our Vision</h3>
                <p>
                  {missionVisionLoading ? 'Loading vision...' : 
                   missionVisionError ? 'Unable to load vision statement.' :
                   missionVisionData?.vision || 'To be the leading platform for community extension programs, creating lasting positive impact in society.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(AboutSection);