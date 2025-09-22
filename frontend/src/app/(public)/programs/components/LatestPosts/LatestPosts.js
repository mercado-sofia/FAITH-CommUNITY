'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePublicNews, usePublicOrganizations } from '../../../hooks/usePublicData';
import styles from './LatestPosts.module.css';

export default function LatestPosts({ orgID }) {
  const { news, isLoading, error } = usePublicNews();
  const { organizations } = usePublicOrganizations();

  // Filter and sort news for this organization (limit to 3 most recent)
  const latestPosts = useMemo(() => {
    if (!news.length || !orgID || !organizations.length) {
      return [];
    }

    // Find the organization by acronym to get its numeric ID
    const organization = organizations.find(org => 
      org.acronym === orgID || org.id.toString() === orgID
    );

    if (!organization) {
      return [];
    }

    const orgNews = news.filter(item => {
      // Match by numeric organization ID
      const newsOrgId = item.organization_id;
      const match = newsOrgId == organization.id;
      return match;
    });

    // Sort by date (newest first) and take only the first 3
    const sortedNews = orgNews
      .sort((a, b) => {
        const dateA = new Date(a.published_at || a.date || a.created_at || 0);
        const dateB = new Date(b.published_at || b.date || b.created_at || 0);
        return dateB - dateA; // Descending order (newest first)
      })
      .slice(0, 3);

    return sortedNews;
  }, [news, orgID, organizations]);


  const truncateToWords = (text, maxWords = 19) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  if (isLoading) {
    return (
      <section className={styles.latestPostsSection}>
        <div className={styles.container}>
          <h2 className={styles.heading}>Latest Posts</h2>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading latest posts...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.latestPostsSection}>
        <div className={styles.container}>
          <h2 className={styles.heading}>Latest Posts</h2>
          <div className={styles.errorContainer}>
            <p>Unable to load latest posts. Please try again later.</p>
          </div>
        </div>
      </section>
    );
  }

  if (latestPosts.length === 0) {
    return null; // Don't render the section at all if no posts
  }

  return (
    <section className={styles.latestPostsSection}>
      <div className={styles.container}>
        <div className={styles.headingContainer}>
          <h2 className={styles.heading}>Latest Posts</h2>
          {latestPosts.length > 0 && (
            <Link href={`/news?news_org=${orgID}`} className={styles.seeAllLink}>
              See All Posts
            </Link>
          )}
        </div>
        
        <div className={styles.postsList}>
          {latestPosts.map((newsItem) => {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
            const imagePath = newsItem.featured_image ? 
              (newsItem.featured_image.startsWith('/') ? newsItem.featured_image : `/${newsItem.featured_image}`) : null;
            const imageUrl = imagePath ? `${baseUrl}${imagePath}` : null;
            
            return (
              <Link key={newsItem.id} href={`/news/${newsItem.slug}`} className={styles.newsCard}>
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
                    {truncateToWords(newsItem.excerpt || newsItem.description, 19)}
                  </p>
                  <span className={styles.readMore}>Read More</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
