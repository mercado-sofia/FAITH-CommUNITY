"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePublicNewsArticle } from "../../hooks/usePublicData";
import { formatDateLong } from "@/utils/dateUtils";
import Loader from "../../../../components/ui/Loader/Loader";
import { usePublicPageLoader } from "../../hooks/usePublicPageLoader";
import styles from "../news.module.css";

export default function NewsDetailPage({ params }) {
  const { slug } = use(params);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`news-${slug}`);
  
  const { article: news, isLoading: dataLoading, error } = usePublicNewsArticle(slug);


  // Force 15px font size by removing inline styles after content loads
  useEffect(() => {
    if (news && pageReady) {
      const timer = setTimeout(() => {
        const contentElement = document.querySelector(`.${styles.newsMainContent}`);
        if (contentElement) {
          // Remove font-size from all inline styles
          const elementsWithStyle = contentElement.querySelectorAll('[style*="font-size"]');
          elementsWithStyle.forEach(element => {
            const style = element.getAttribute('style');
            if (style) {
              const newStyle = style.replace(/font-size:\s*[^;]+;?/gi, '');
              if (newStyle.trim()) {
                element.setAttribute('style', newStyle);
              } else {
                element.removeAttribute('style');
              }
            }
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [news, pageReady]);

  // Handle 404 case - only check after data loading is complete
  if (!dataLoading && !news && !error) {
    notFound();
  }

  // Using centralized date utility - format remains exactly the same
  const formatDate = (dateString) => {
    return formatDateLong(dateString);
  };

  // Only show loader if actually loading or if it's the first visit and needs extra time
  if (pageLoading || !pageReady || dataLoading) {
    return <Loader small centered />;
  }

  if (error) {
    return (
      <main className={styles.container}>
        <h1 className={styles.heading}>Article Error</h1>
        <div className={styles.errorContainer}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // Additional safety check - this should not be reached due to earlier check
  if (!news) {
    return (
      <main className={styles.container}>
        <h1 className={styles.heading}>Article Not Found</h1>
        <div className={styles.errorContainer}>
          <p>Article not found</p>
          <Link 
            href="/news"
            className={styles.retryButton}
            style={{ textDecoration: 'none', display: 'inline-block' }}
          >
            Back to News
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      {/* Breadcrumb Navigation */}
      <div className={styles.breadcrumb}>
        <Link 
          href="/" 
          className={styles.breadcrumbLink}
        >
          Home
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <Link 
          href="/news" 
          className={styles.breadcrumbLink}
        >
          News
        </Link>
        <span className={styles.breadcrumbSeparator}>›</span>
        <span className={styles.breadcrumbCurrent}>
          {news?.title || 'Article'}
        </span>
      </div>

      {/* News Content */}
      <article className={styles.newsArticle}>
        {/* News Header */}
        <header className={styles.newsHeader}>
          <h1 className={styles.newsDetailTitle}>
            {news.title}
          </h1>
          
          <div className={styles.newsMetaInfo}>
            <div><em>Published:</em> {formatDate(news.published_at || news.date)}</div>
            {news.updated_at && 
             news.updated_at !== news.published_at && 
             news.updated_at !== news.date && 
             news.updated_at !== news.created_at && 
             new Date(news.updated_at).getTime() !== new Date(news.published_at || news.date).getTime() && (
              <div><em>Updated:</em> {formatDate(news.updated_at)}</div>
            )}
            <div><em>By:</em> {news.orgName || news.orgID || 'Unknown Organization'}</div>
          </div>
        </header>

        {/* Featured Image - Display prominently after header */}
        {news.featured_image && (() => {
          const imageUrl = news.featured_image;
          
          return (
            <div className={styles.featuredImageContainer}>
              <Image
                src={imageUrl}
                alt={news.title || 'News image'}
                width={800}
                height={450}
                className={styles.featuredImage}
                priority
                onError={(e) => {
                  if (e.target) {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>
          );
        })()}

        {/* News Content */}
        <div className={styles.newsContentWrapper}>
          {/* Show excerpt if available */}
          {news.excerpt && (
            <div className={styles.newsExcerpt}>
              &ldquo;{news.excerpt}&rdquo;
            </div>
          )}
          
          {/* Main content with proper styling for rich text */}
          <div 
            className={`${styles.newsMainContent} ${styles.newsContent}`}
            dangerouslySetInnerHTML={{ 
              __html: news.content || news.description || '<p>No content available</p>' 
            }} 
          />
        </div>
      </article>
    </main>
  );
}