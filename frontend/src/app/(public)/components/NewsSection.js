"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './styles/newsSection.module.css';
import { usePublicOrganizations, usePublicNews } from '../../../hooks/usePublicData';

export default function NewsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgNavRef = useRef(null);
  const initialOrgSetRef = useRef(false);
  
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Swipe functionality states
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Use SWR hooks for data fetching
  const { organizations: orgsData, isLoading: orgLoading, error: orgError } = usePublicOrganizations();
  const { news, isLoading: newsLoading, error: newsError } = usePublicNews();

  // No debug logging in production

  // Process organizations with latest news dates
  const organizations = useMemo(() => {
    if (!orgsData.length || !news.length) return orgsData;

    const orgsWithLatestNews = orgsData.map(org => {
      const orgNews = news.filter(item => item.organization_id === org.id);
      const latestNews = orgNews.length > 0 ? orgNews[0] : null;
      return {
        ...org,
        latestNewsDate: latestNews ? new Date(latestNews.created_at || latestNews.date) : new Date(0)
      };
    });

    // Sort organizations by latest announcement date (newest first)
    return orgsWithLatestNews.sort((a, b) => b.latestNewsDate - a.latestNewsDate);
  }, [orgsData, news]);

  // Handle initial organization selection and URL parameters
  useEffect(() => {
    const urlOrg = searchParams.get('news_org');
    
    if (urlOrg && organizations.length > 0) {
      // If URL has organization parameter, try to find by ID first, then by acronym
      let org = organizations.find(o => o.id.toString() === urlOrg);
      
      // If not found by ID, try by acronym
      if (!org) {
        org = organizations.find(o => o.acronym === urlOrg);
      }
      
      if (org) {
        setSelectedOrg(org);
        initialOrgSetRef.current = true;
      }
    } else if (organizations.length > 0 && !initialOrgSetRef.current) {
      // If no URL parameter and organizations are loaded, select the first one
      const initialOrg = organizations[0];
      setSelectedOrg(initialOrg);
      initialOrgSetRef.current = true;
    }
  }, [searchParams, organizations]);

  const handleOrgClick = (orgObj, index) => {
    setSelectedOrg(orgObj);
    // Use acronym in URL for better readability
    router.push(`${pathname}?news_org=${orgObj.acronym || orgObj.id}`, { scroll: false });
  };

  // Filter news based on selected organization
  const filteredNews = useMemo(() => {
    if (!selectedOrg) return news;
    
    const filtered = news.filter(item => item.organization_id == selectedOrg.id);
    return filtered;
  }, [news, selectedOrg]);

  // Touch/trackpad swipe handlers
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const currentX = e.touches[0].clientX;
      const diff = currentX - touchStartX;
      setDragOffset(diff);
      
      // Update scroll position in real-time with smooth following
      const container = orgNavRef.current;
      if (container) {
        const newScrollPosition = container.scrollLeft - diff * 1.5; // Increased sensitivity
        container.scrollLeft = Math.max(0, newScrollPosition);
        setScrollPosition(newScrollPosition);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDragOffset(0);
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
        const newScrollPosition = container.scrollLeft + deltaX * 2; // Increased sensitivity for trackpad
        container.scrollLeft = Math.max(0, newScrollPosition);
        setScrollPosition(newScrollPosition);
      }
    }
  };



  const visibleOrgs = organizations; // Display all organizations
  const maxDisplay = 6;

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if ((orgLoading || newsLoading) && organizations.length === 0) {
    return (
      <section className={styles.newsSection}>
        <div className={styles.newsContainer}>
          <h2 className={styles.heading}>Latest News & Announcements</h2>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #167c59', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p>Loading news...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.newsSection}>
      <div className={styles.newsContainer}>
        <h2 className={styles.heading}>Latest News & Announcements</h2>
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
                         {visibleOrgs.map((orgObj, index) => {
               // Check if this organization is active by comparing with selectedOrg
               const isActive = selectedOrg && selectedOrg.id === orgObj.id;
               
               return (
                <div
                  key={`${orgObj.id}-${index}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => handleOrgClick(orgObj, index)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleOrgClick(orgObj, index)}
                  className={`${styles.orgItem} ${isActive ? styles.active : ""}`}
                >
                  <Image
                    src={orgObj.logo ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080'}${orgObj.logo}` : `/logo/${orgObj.acronym?.toLowerCase()}_logo.jpg`}
                    alt={`${orgObj.acronym || orgObj.name} logo`}
                    width={30}
                    height={30}
                    className={styles.orgLogo}
                    onError={(e) => {
                      e.target.src = `/logo/${orgObj.acronym?.toLowerCase()}_logo.jpg`;
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
               <div style={{ 
                 width: '40px', 
                 height: '40px', 
                 border: '4px solid #f3f3f3', 
                 borderTop: '4px solid #167c59', 
                 borderRadius: '50%', 
                 animation: 'spin 1s linear infinite',
                 margin: '0 auto 1rem'
               }}></div>
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
            filteredNews.slice(0, maxDisplay).map((newsItem) => (
              <Link key={newsItem.id} href={`/news/${newsItem.id}`} className={styles.newsCard}>
                <p className={styles.newsDate}>
                  {formatDate(newsItem.date)} / By {newsItem.orgName || newsItem.orgID || 'Unknown Organization'}
                </p>
                <h3 className={styles.newsTitle}>{newsItem.title}</h3>
                <p className={styles.newsDesc}>
                  {newsItem.description && newsItem.description.length > 128
                    ? `${newsItem.description.substring(0, 128)}...`
                    : newsItem.description}
                </p>
                <span className={styles.readMore}>Read More</span>
              </Link>
            ))
          )}
        </div>

        {filteredNews.length > maxDisplay && (
          <div className={styles.seeAllNewsContainer}>
            <Link href={`/news?news_org=${selectedOrg?.acronym || selectedOrg?.id}`} className={styles.seeAllNewsBtn}>
              SEE ALL NEWS
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}