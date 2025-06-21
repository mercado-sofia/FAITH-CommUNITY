'use client';

import Image from 'next/image';
import styles from '../programs.module.css';

export default function ProgramCard({ project }) {
  return (
    <div className={styles.card}>
      <Image
        src={project.image}
        alt={project.title}
        width={400}
        height={240}
        className={styles.cardImage}
        priority
      />

      <div className={styles.cardContent}>
        <p className={styles.cardCategory}>{project.category}</p>
        <h3 className={styles.cardTitle}>{project.title}</h3>

        <div className={styles.cardOrg}>
          <Image
            src={project.icon}
            alt={`${project.orgName} logo`}
            width={24}
            height={24}
            className={styles.cardOrgIcon}
          />
          <span>{project.orgName}</span>
        </div>

        <p className={styles.cardDesc}>{project.description}</p>

        {/* Optional: Add visible date */}
        <p className={styles.cardDate}>
          Posted on {new Date(project.date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
    </div>
  );
}