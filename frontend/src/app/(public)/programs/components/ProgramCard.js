"use client";

import Image from 'next/image';
import Link from 'next/link';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from '../programs.module.css';

export default function ProgramCard({ project }) {

  return (
    <div className={styles.card}>
      {project.image && project.image.startsWith('data:image/') && project.image.includes('base64,') ? (
        // Use regular img tag for valid base64 images
        <img
          src={project.image}
          alt={project.title}
          className={styles.cardImage}
          style={{ width: '100%', height: '240px', objectFit: 'cover' }}
          onError={(e) => {
            console.error('Failed to load base64 image:', project.image.substring(0, 50) + '...');
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'block';
          }}
        />
      ) : project.image && !project.image.startsWith('data:') ? (
        // Use Next.js Image for regular URLs (including relative file paths)
        <Image
          src={getProgramImageUrl(project.image)}
          alt={project.title}
          width={400}
          height={240}
          className={styles.cardImage}
          priority
        />
      ) : (
        // Fallback placeholder for missing or invalid images
        <div 
          className={styles.cardImage}
          style={{ 
            width: '100%', 
            height: '240px', 
            backgroundColor: '#f3f4f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          No Image Available
        </div>
      )}
      {/* Hidden fallback for image error */}
      <div 
        style={{ 
          width: '100%', 
          height: '240px', 
          backgroundColor: '#f3f4f6', 
          display: 'none', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}
      >
        Image Failed to Load
      </div>

      <div className={styles.cardContent}>
        <p className={styles.cardCategory}>{project.category}</p>

        <Link href={`/programs/view/${project.id}`} className={styles.cardTitle}>
          {project.title}
        </Link>

        <Link href={`/programs/org/${project.orgID}`} className={styles.cardOrg}>
          <Image
            src={project.icon ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${project.icon}` : '/logo/faith_community_logo.png'}
            alt={`${project.orgName} logo`}
            width={24}
            height={24}
            className={styles.cardOrgIcon}
            onError={(e) => {
              e.target.src = '/logo/faith_community_logo.png';
            }}
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