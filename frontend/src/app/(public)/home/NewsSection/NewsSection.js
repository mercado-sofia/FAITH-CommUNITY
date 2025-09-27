"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './NewsSection.module.css';
import { usePublicOrganizations, usePublicNews } from '../../hooks/usePublicData';
import { formatDateLong } from '@/utils/dateUtils';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';

export default function NewsSection() {
  const orgNavRef = useRef(null);
  
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Swipe functionality states
  const [touchStartX, setTouchStartX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Use SWR hooks for data fetching
  const { organizations: orgsData, isLoading: orgLoading, error: orgError } = usePublicOrganizations();
  const { news, isLoading: newsLoading, error: newsError } = usePublicNews();

  // Process organizations with latest news dates
  const organizations = useMemo(() => {
    if (!orgsData.length) return [];

    // If no news data, return organizations as-is
    if (!news.length) {
      return orgsData;
    }

    const orgsWithLatestNews = orgsData.map(org => {
      const orgNews = news.filter(item => {
        // Handle both string and number types
        const newsOrgId = item.organization_id;
        const orgId = org.id;
        const match = newsOrgId == orgId;
        return match;
      });
      
      // Find the latest news by sorting and taking the first one
      const latestNews = orgNews.length > 0 
        ? orgNews.sort((a, b) => {
            const dateA = new Date(a.published_at || a.date || a.created_at || 0);
            const dateB = new Date(b.published_at || b.date || b.created_at || 0);
            return dateB - dateA;
          })[0] 
        : null;
      
      const latestDate = latestNews ? new Date(latestNews.published_at || latestNews.date || latestNews.created_at || 0) : new Date(0);
      
      return {
        ...org,
        latestNewsDate: latestDate
      };
    });

    // Sort organizations by latest announcement date (newest first)
    const sortedOrgs = orgsWithLatestNews.sort((a, b) => b.latestNewsDate - a.latestNewsDate);
    
    return sortedOrgs;
  }, [orgsData, news]);

  // Handle initial organization selection - always reset to first organization
  useEffect(() => {
    if (organizations.length > 0) {
      // Always select the first organization (most recent news) on every render
      const initialOrg = organizations[0];
      setSelectedOrg(initialOrg);
    }
  }, [organizations]);


  const handleOrgClick = (orgObj, index) => {
    setSelectedOrg(orgObj);
  };

  // Filter news based on selected organization and sort by date (newest first)
  const filteredNews = useMemo(() => {
    if (!selectedOrg) {
      return [...news].sort((a, b) => {
        const dateA = new Date(a.published_at || a.date || a.created_at || 0);
        const dateB = new Date(b.published_at || b.date || b.created_at || 0);
        return dateB - dateA;
      });
    }
    
    const filtered = news.filter(item => {
      const newsOrgId = item.organization_id;
      const selectedOrgId = selectedOrg.id;
      return newsOrgId == selectedOrgId;
    });
    
    // Sort filtered news by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.published_at || a.date || a.created_at || 0);
      const dateB = new Date(b.published_at || b.date || b.created_at || 0);
      return dateB - dateA; // Descending order (newest first)
    });
  }, [news, selectedOrg]);

  // Touch/trackpad swipe handlers
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStartX;
      
      // Update scroll position in real-time
      const container = orgNavRef.current;
      if (container) {
        const newScrollPosition = container.scrollLeft - diff * 1.5;
        container.scrollLeft = Math.max(0, newScrollPosition);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Trackpad wheel handler
  const handleWheel = (e) => {
    // Only handle horizontal scrolling (deltaX)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const deltaX = e.deltaX;
      
      // Update scroll position in real-time
      const container = orgNavRef.current;
      if (container) {
        const newScrollPosition = container.scrollLeft + deltaX * 2;
        container.scrollLeft = Math.max(0, newScrollPosition);
      }
    }
  };

  const maxDisplay = 6;

  // Using centralized date utility - format remains exactly the same
  const formatDate = (dateString) => {
    return formatDateLong(dateString);
  };

  if ((orgLoading || newsLoading) && organizations.length === 0) {
    // During loading, we don't know if there will be news, so use default spacing
    return (
      <section className={styles.newsSection}>
        <div className={styles.newsContainer}>
          <div className={styles.headingContainer}>
            <h2 className={styles.heading}>Latest News & Announcements</h2>
            <Link href="/news" className={styles.seeAllLink}>See All</Link>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className={styles.spinner}></div>
            <p>Loading news...</p>
          </div>
        </div>
      </section>
    );
  }

  // Check if there are any news items to determine spacing
  const hasNews = news && news.length > 0;
  const sectionClassName = hasNews ? styles.newsSection : `${styles.newsSection} ${styles.noNews}`;

  return (
    <section className={sectionClassName}>
      <div className={styles.newsContainer}>
        <div className={styles.headingContainer}>
          <h2 className={styles.heading}>Latest News & Announcements</h2>
          <Link href="/news" className={styles.seeAllLink}>See All News</Link>
        </div>
      </div>

      {organizations.length > 0 && (
        <div className={styles.orgNav}>
          <div 
            className={styles.orgNavInner} 
            ref={orgNavRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {organizations.map((orgObj, index) => {
               // Check if this organization is active by comparing with selectedOrg
               const isActive = selectedOrg && selectedOrg.id === orgObj.id;
               
               return (
                <div
                  key={`${orgObj.id}-${index}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  data-org-id={orgObj.id}
                  onClick={() => handleOrgClick(orgObj, index)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOrgClick(orgObj, index)}
                  className={`${styles.orgItem} ${isActive ? styles.active : ""}`}
                >
                  <Image
                    src={getOrganizationImageUrl(orgObj.logo, 'logo')}
                    alt={`${orgObj.acronym || orgObj.name} logo`}
                    width={30}
                    height={30}
                    className={styles.orgLogo}
                    onError={(e) => {
                      // Use a default logo if the specific one doesn't exist
                      e.target.src = '/assets/logos/faith_community_logo.png';
                    }}
                  />
                  <span>{orgObj.acronym || orgObj.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.newsContainer}>
        <div className={styles.newsList}>
                     {newsLoading ? (
             <div style={{ 
               gridColumn: '1 / -1', 
               textAlign: 'center', 
               padding: '2rem',
               color: '#6b7280'
             }}>
               <div className={styles.spinner}></div>
               <p>Loading news...</p>
             </div>
           ) : newsError ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '2rem',
              color: '#dc3545'
            }}>
                             <p>{newsError?.message || 'An error occurred while loading news'}</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '2rem',
              color: '#6b7280'
            }}>
              <p>No announcements yet</p>
            </div>
          ) : (
            filteredNews.slice(0, maxDisplay).map((newsItem) => {
              const imageUrl = newsItem.featured_image || null;
              
              return (
                <div key={newsItem.id} className={styles.newsCard}>
                  {imageUrl && (
                    <div className={styles.newsImageContainer}>
                      <Image
                        src={imageUrl}
                        alt={newsItem.title || 'News image'}
                        width={200}
                        height={120}
                        className={styles.newsImage}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className={styles.newsContent}>
                    <h3 className={styles.newsTitle}>{newsItem.title}</h3>
                    <p className={styles.newsDesc}>
                      {newsItem.excerpt || newsItem.description}
                    </p>
                    <p className={styles.newsDate}>
                      <em>Published:</em> {formatDate(newsItem.published_at || newsItem.date)}<br />
                      <em>By:</em> {newsItem.orgName || 'Unknown Organization'}
                    </p>
                    <Link href={`/news/${newsItem.slug}`} className={styles.readMore}>Read More</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filteredNews.length > maxDisplay && (
          <div className={styles.seeAllNewsContainer}>
            <Link href="/news" className={styles.seeAllNewsBtn}>
              SEE ALL NEWS
            </Link>
          </div>
        )}
      </div>

    </section>
  );
}