"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './styles/newsSection.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function NewsSection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const orgNavRef = useRef(null);
  const initialOrgSetRef = useRef(false);
  
  const [organizations, setOrganizations] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  // Swipe functionality states
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Fetch organizations from database
  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/organizations`);
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const result = await response.json();
      if (result.success) {
        const orgsData = result.data || [];
        
        // Fetch latest news for each organization to determine order
        const orgsWithLatestNews = await Promise.all(
          orgsData.map(async (org) => {
            try {
              const newsResponse = await fetch(`${API_BASE_URL}/api/news/org/${org.id}`);
              if (newsResponse.ok) {
                const newsData = await newsResponse.json();
                const latestNews = Array.isArray(newsData) && newsData.length > 0 
                  ? newsData[0] 
                  : null;
                return {
                  ...org,
                  latestNewsDate: latestNews ? new Date(latestNews.created_at || latestNews.date) : new Date(0)
                };
              }
              return { ...org, latestNewsDate: new Date(0) };
            } catch (error) {
              return { ...org, latestNewsDate: new Date(0) };
            }
          })
        );

        // Sort organizations by latest announcement date (newest first)
        const sortedOrgs = orgsWithLatestNews.sort((a, b) => b.latestNewsDate - a.latestNewsDate);
        console.log('📊 Organizations ordered by latest announcements:', sortedOrgs.map(org => ({
          name: org.acronym,
          latestNewsDate: org.latestNewsDate
        })));
        setOrganizations(sortedOrgs);
      } else {
        throw new Error(result.message || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    }
  };

  // Fetch news data from database
  const fetchNews = async (orgId = null) => {
    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE_URL}/api/news`;
      if (orgId) {
        url = `${API_BASE_URL}/api/news/org/${orgId}`;
      }

      console.log('🔍 Fetching news from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📰 Fetched news:', data);
      setNews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('❌ Error fetching news:', error);
      setError('Failed to fetch news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Handle initial organization selection and URL parameters
  useEffect(() => {
    const urlOrg = searchParams.get('news_org');
    
    if (urlOrg) {
      // If URL has organization parameter, use it
      console.log('🔍 Setting organization from URL:', urlOrg);
      setSelectedOrg(urlOrg.toString());
      fetchNews(urlOrg);
      initialOrgSetRef.current = true;
    } else if (organizations.length > 0 && !initialOrgSetRef.current) {
      // If no URL parameter and organizations are loaded, select the first one
      const initialOrg = organizations[0];
      console.log('🔍 Setting initial organization:', initialOrg);
      setSelectedOrg(initialOrg.id.toString());
      fetchNews(initialOrg.id);
      initialOrgSetRef.current = true;
    }
  }, [searchParams, organizations]);

  const handleOrgClick = (orgObj, index) => {
    setSelectedOrg(orgObj.id.toString());
    router.push(`${pathname}?news_org=${orgObj.id}`, { scroll: false });
    fetchNews(orgObj.id);

    // This logic needs to be re-evaluated for real-time swipe
    // For now, it will just update the selectedOrg and fetch news
  };

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

  const filteredNews = useMemo(() => {
    // The API already returns filtered news when orgId is provided, so just return the news
    return news;
  }, [news]);

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

  if (loading && organizations.length === 0) {
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
              const isActive = selectedOrg === orgObj.id.toString();
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
                    src={orgObj.logo || `/logo/${orgObj.acronym?.toLowerCase()}_logo.jpg`}
                    alt={`${orgObj.acronym || orgObj.name} logo`}
                    width={30}
                    height={30}
                    className={styles.orgLogo}
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
          {loading ? (
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
          ) : error ? (
            <div style={{ 
              gridColumn: '1 / -1', 
              textAlign: 'center', 
              padding: '2rem',
              color: '#dc3545'
            }}>
              <p>{error}</p>
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
            <Link href={`/news?news_org=${selectedOrg}`} className={styles.seeAllNewsBtn}>
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