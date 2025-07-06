"use client";

import Image from 'next/image';
import Link from 'next/link';
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

        <Link href={`/programs/view/${project.id}`} className={styles.cardTitle}>
          {project.title}
        </Link>

        <Link href={`/programs/org/${project.orgID}`} className={styles.cardOrg}>
          <Image
            src={project.icon}
            alt={`${project.orgName} logo`}
            width={24}
            height={24}
            className={styles.cardOrgIcon}
          />
          <span>{project.orgName}</span>
        </Link>

        <p className={styles.cardDesc}>{project.description}</p>

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