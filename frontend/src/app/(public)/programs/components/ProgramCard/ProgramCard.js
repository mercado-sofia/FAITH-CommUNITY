"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths';
import { formatDateLong } from '@/utils/dateUtils';
import styles from './ProgramCard.module.css';
import logger from '@/utils/logger';

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
const DateBadge = ({ dateInfo, status }) => {
  if (status !== 'Upcoming') return null;
  
  // If no date info, show TBA badge
  if (!dateInfo) {
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
            href="/assets/icons/BadgeShort.svg" 
            width="80" 
            height="60" 
            preserveAspectRatio="xMidYMid slice"
          />
          {/* TBA text - centered */}
          <text 
            x="40" 
            y="35"
            textAnchor="middle" 
            fill="white" 
            fontSize="14" 
            fontWeight="700"
            className={styles.dateBadgeDay}
          >
            TBA
          </text>
        </svg>
      </div>
    );
  }
  
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
            href="/assets/icons/BadgeShort.svg" 
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
            href="/assets/icons/BadgeLong.svg" 
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

// Helper function to format collaboration badge text
const formatCollaborationBadgeText = (collaborators) => {
  if (!collaborators || collaborators.length === 0) {
    return 'Collaborative';
  }

  if (collaborators.length === 1) {
    return collaborators[0].organization_name;
  }

  if (collaborators.length === 2) {
    return `${collaborators[0].organization_name} & ${collaborators[1].organization_name}`;
  }

  // For 3+ organizations, show first two and count
  const remainingCount = collaborators.length - 2;
  return `${collaborators[0].organization_name}, ${collaborators[1].organization_name} +${remainingCount}`;
};

export default function ProgramCard({ project }) {
  const dateInfo = getDateInfo(project);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);

  const handleMouseEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
      setIsHovering(true);
    }
  };

  const handleMouseLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (containerRef.current) {
      setIsHovering(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsHovering(false);
    };
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardImageContainer}>
        {project.image ? (
          <Image
            src={getProgramImageUrl(project.image)}
            alt={project.title}
            width={400}
            height={240}
            className={styles.cardImage}
            onError={(e) => {
              logger.error('Failed to load program image', null, { 
                projectId: project.id, 
                imageUrl: project.image 
              });
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        {/* Fallback for missing or failed images */}
        <div 
          className={styles.cardImage}
          style={{ 
            backgroundColor: '#f3f4f6', 
            display: project.image ? 'none' : 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}
        >
          {project.image ? 'Image Failed to Load' : 'No Image Available'}
        </div>
        
        {/* Date Badge */}
        <DateBadge dateInfo={dateInfo} status={project.status} />
      </div>

      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <p className={styles.cardCategory}>{project.category}</p>
          {(project.is_collaborative === true || project.is_collaborative === 1) && project.collaborators && project.collaborators.length > 0 && (
            <div 
              ref={containerRef}
              className={styles.collaborationBadgeContainer}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Floating organization name */}
              {isHovering && project.collaborators && project.collaborators.length > 0 && (
                <div className={styles.floatingLabel}>
                  {formatCollaborationBadgeText(project.collaborators)}
                </div>
              )}
              
              {/* Clickable Badge */}
              <Link href={`/programs/${project.slug || project.id}`} className={styles.collaborationBadgeLink}>
                <div className={styles.collaborationBadge}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path 
                      d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0413 20.9999 15.5754 20.2 15.366" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M16 3.36603C16.7999 3.57538 17.5033 4.04131 18.0094 4.69767C18.5155 5.35403 18.8 6.16448 18.8 7C18.8 7.83552 18.5155 8.64597 18.0094 9.30233C17.5033 9.95869 16.7999 10.4246 16 10.634" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Collaborative</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        <Link href={`/programs/${project.slug || project.id}`} className={styles.cardTitle}>
          {project.title}
        </Link>

        <Link href={`/programs/org/${project.orgAcronym || project.orgID}`} className={styles.cardOrg}>
          {project.orgLogo ? (
            <Image
              src={getOrganizationImageUrl(project.orgLogo)}
              alt={`${project.orgName} logo`}
              width={24}
              height={24}
              className={styles.cardOrgIcon}
              onError={(e) => {
                logger.error('Failed to load organization logo', null, { 
                  projectId: project.id, 
                  orgName: project.orgName,
                  logoUrl: project.orgLogo 
                });
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            />
          ) : null}
          <div 
            className={styles.cardOrgIconFallback} 
            style={{ display: project.orgLogo ? 'none' : 'block' }}
          ></div>
          <span>{project.orgName}</span>
        </Link>

        <p className={styles.cardDesc}>{project.description}</p>

        <p className={styles.cardDate}>
          Posted on {formatDateLong(project.date)}
        </p>
      </div>
    </div>
  );
}