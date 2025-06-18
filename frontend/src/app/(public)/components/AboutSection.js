'use client';

import styles from '../styles/AboutSection.module.css';
import Image from 'next/image';
import { FaHeart, FaCube } from 'react-icons/fa';

export default function AboutSection() {
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
              priority
            />
          </div>

          <div className={styles.aboutContent}>
            <p className={styles.aboutLabel}>Who we are</p>
            <h2 className={styles.aboutHeading}>The Story Behind FAITH CommUNITY</h2>
            <p className={styles.aboutParagraph}>
              FAITH CommUNITY serves as a bridge between volunteers and organizations,
              created to support and document the shared efforts of the FAITH Colleges
              community in delivering meaningful outreach and service.
            </p>
          </div>
        </div>

        <div className={styles.aboutBoxes}>
          <div className={styles.missionbox}>
            <FaHeart className={styles.abouticon} />
            <h3>Our Mission</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. In pretium vitae est non lacinia. Aenean ullam eleifend massa, eu facilisis lectus ornare vel.
            </p>
          </div>
          <div className={styles.visionbox}>
            <FaCube className={styles.abouticon} />
            <h3>Our Vision</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. In pretium vitae est non lacinia. Aenean ullam eleifend massa, eu facilisis lectus ornare vel.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}