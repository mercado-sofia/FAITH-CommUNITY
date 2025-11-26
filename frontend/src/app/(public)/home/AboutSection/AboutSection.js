'use client';

import styles from './AboutSection.module.css';
import Image from 'next/image';
import { FaHeart, FaCube } from 'react-icons/fa';
import { usePublicSiteName, usePublicMissionVision, usePublicAboutUs } from '@/hooks/(public)/usePublicData';
import { useFadeIn } from '@/hooks/(public)/useFadeIn';

function AboutSection() {
  const { siteNameData } = usePublicSiteName();
  const { missionVisionData, isLoading: missionVisionLoading, error: missionVisionError } = usePublicMissionVision();
  const { aboutUsData, isLoading: aboutUsLoading } = usePublicAboutUs();
  const { ref: sectionRef, isVisible: isSectionVisible } = useFadeIn();
  const { ref: imageRef, isVisible: isImageVisible } = useFadeIn({ rootMargin: '0px 0px -100px 0px' });
  const { ref: contentRef, isVisible: isContentVisible } = useFadeIn({ rootMargin: '0px 0px -100px 0px' });

  return (
    <section ref={sectionRef} className={`${styles.aboutSection} ${isSectionVisible ? styles.fadeIn : ''}`}>
      <div className={styles.aboutWrapper}>
          <div ref={imageRef} className={`${styles.aboutImageWrapper} ${isImageVisible ? styles.fadeIn : ''}`}>
            <Image
              src={aboutUsLoading ? "/samples/sample1.jpg" : (aboutUsData?.image_url || "/samples/sample1.jpg")}
              alt="About Us Image"
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

          <div ref={contentRef} className={`${styles.aboutContent} ${isContentVisible ? styles.fadeIn : ''}`}>
            <p className={styles.aboutLabel}>Who we are</p>
            <h2 className={styles.aboutHeading}>The Story Behind {siteNameData?.site_name || 'FAITH CommUNITY'}</h2>
            <p className={styles.aboutParagraph}>
              {aboutUsLoading ? 'Loading description...' : aboutUsData?.description}
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
    </section>
  );
}

export default AboutSection;