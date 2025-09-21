"use client";

import Image from 'next/image';
import Link from 'next/link';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './ProgramCard.module.css';
import logger from '../../../../../utils/logger';

// Utility function to get date information from various date formats
const getDateInfo = (project) => {
  // Check for multiple dates first
  if (project.multiple_dates && Array.isArray(project.multiple_dates) && project.multiple_dates.length > 0) {
    const dates = project.multiple_dates.map(date => new Date(date));
    const earliestDate = new Date(Math.min(...dates));
    return {
      type: 'single',
      startDate: earliestDate,
      endDate: null
    };
  }
  
  // Check for date range (when both start and end dates exist AND they are different)
  if (project.event_start_date && project.event_end_date) {
    const startDate = new Date(project.event_start_date);
    const endDate = new Date(project.event_end_date);
    
    // If start and end dates are the same, treat as single date
    if (startDate.getTime() === endDate.getTime()) {
      return {
        type: 'single',
        startDate: startDate,
        endDate: null
      };
    }
    
    // If they are different, treat as range
    return {
      type: 'range',
      startDate: startDate,
      endDate: endDate
    };
  }
  
  // Check for single date (only start date exists)
  if (project.event_start_date && !project.event_end_date) {
    return {
      type: 'single',
      startDate: new Date(project.event_start_date),
      endDate: null
    };
  }
  
  return null;
};

// Date Badge Component
const DateBadge = ({ dateInfo }) => {
  if (!dateInfo) return null;
  
  const { type, startDate, endDate } = dateInfo;
  
  if (type === 'single') {
    const day = startDate.getDate().toString().padStart(2, '0');
    const month = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    return (
      <div className={styles.dateBadge} style={{ left: '-15px' }}>
        <svg 
          width="80" 
          height="60" 
          viewBox="0 0 80 60" 
          className={styles.dateBadgeSvg}
        >
          {/* Use the short badge SVG */}
          <image 
            href="/BadgeShort.svg" 
            width="80" 
            height="60" 
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Day text - centered vertically */}
          <text 
            x="40" 
            y="30"
            textAnchor="middle" 
            fill="white" 
            fontSize="18" 
            fontWeight="700"
            className={styles.dateBadgeDay}
          >
            {day}
          </text>
          {/* Month text - centered vertically */}
          <text 
            x="40" 
            y="48" 
            textAnchor="middle" 
            fill="white" 
            fontSize="12" 
            fontWeight="600"
            className={styles.dateBadgeMonth}
          >
            {month}
          </text>
        </svg>
      </div>
    );
  }
  
  if (type === 'range') {
    const startDay = startDate.getDate().toString().padStart(2, '0');
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const endDay = endDate.getDate().toString().padStart(2, '0');
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    return (
      <div className={styles.dateBadge} style={{ left: '-15px' }}>
        <svg 
          width="120" 
          height="60" 
          viewBox="0 0 120 60" 
          className={styles.dateBadgeSvg}
        >
          {/* Use the long badge SVG */}
          <image 
            href="/BadgeLong.svg" 
            width="120" 
            height="60" 
            preserveAspectRatio="xMidYMid slice"
          />
          {/* Start date - centered vertically */}
          <text 
            x="40" 
            y="30" 
            textAnchor="middle" 
            fill="white" 
            fontSize="16" 
            fontWeight="700"
            className={styles.dateBadgeDay}
          >
            {startDay}
          </text>
          <text 
            x="40" 
            y="48" 
            textAnchor="middle" 
            fill="white" 
            fontSize="11" 
            fontWeight="600"
            className={styles.dateBadgeMonth}
          >
            {startMonth}
          </text>
          {/* Separator */}
          <text 
            x="60" 
            y="36" 
            textAnchor="middle" 
            fill="white" 
            fontSize="14" 
            fontWeight="600"
          >
            -
          </text>
          {/* End date - centered vertically */}
          <text 
            x="80" 
            y="30" 
            textAnchor="middle" 
            fill="white" 
            fontSize="16" 
            fontWeight="700"
            className={styles.dateBadgeDay}
          >
            {endDay}
          </text>
          <text 
            x="80" 
            y="48" 
            textAnchor="middle" 
            fill="white" 
            fontSize="11" 
            fontWeight="600"
            className={styles.dateBadgeMonth}
          >
            {endMonth}
          </text>
        </svg>
      </div>
    );
  }
  
  return null;
};

export default function ProgramCard({ project }) {
  const dateInfo = getDateInfo(project);

  return (
    <div className={styles.card}>
      <div className={styles.cardImageContainer}>
        {project.image && project.image.startsWith('data:image/') && project.image.includes('base64,') ? (
          // Use regular img tag for valid base64 images
          <Image
            src={project.image}
            alt={project.title}
            width={400}
            height={240}
            className={styles.cardImage}
            onError={(e) => {
              logger.error('Failed to load base64 image', null, { 
                projectId: project.id, 
                imagePreview: project.image.substring(0, 50) + '...' 
              });
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
          className={styles.cardImage}
          style={{ 
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
        
        {/* Date Badge */}
        <DateBadge dateInfo={dateInfo} />
      </div>

      <div className={styles.cardContent}>
        <p className={styles.cardCategory}>{project.category}</p>

        <Link href={`/programs/${project.slug || project.id}`} className={styles.cardTitle}>
          {project.title}
        </Link>

        <Link href={`/programs/org/${project.orgID || project.org || project.organization || project.orgAcronym}`} className={styles.cardOrg}>
          {project.icon ? (
            <Image
              src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${project.icon}`}
              alt={`${project.orgName} logo`}
              width={24}
              height={24}
              className={styles.cardOrgIcon}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          <div className={styles.cardOrgIconFallback} style={{ display: project.icon ? 'none' : 'block' }}></div>
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