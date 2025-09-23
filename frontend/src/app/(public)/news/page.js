"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { usePublicOrganizations, usePublicNews } from "../hooks/usePublicData";
import { formatDateLong } from "@/utils/dateUtils";
import styles from "./news.module.css";
import { Pagination } from "../components";
import Loader from "../../../components/Loader";
import { usePublicPageLoader } from "../hooks/usePublicPageLoader";

export default function AllNewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgFilter = searchParams.get("news_org");
  const highlightNewsId = searchParams.get("highlight");
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader('news');
  
  const [highlightedNewsId, setHighlightedNewsId] = useState(null);
  
  const NEWS_PER_PAGE = 10;

  const { organizations, isLoading: orgLoading, error: orgError } = usePublicOrganizations();
  const { news, isLoading: newsLoading, error: newsError } = usePublicNews();

  const filteredNews = useMemo(() => {
    let filtered = news;
    
    if (orgFilter) {
      const targetOrg = organizations.find(org => 
        org.id.toString() === orgFilter || org.acronym === orgFilter
      );
      
      if (targetOrg) {
        filtered = news.filter(item => item.organization_id === targetOrg.id);
      }
    }
    
    // Sort by most recent date first
    return filtered.sort((a, b) => new Date(b.published_at || b.date) - new Date(a.published_at || a.date));
  }, [news, orgFilter, organizations]);


  useEffect(() => {
    if (highlightNewsId && pageReady) {
      setHighlightedNewsId(highlightNewsId);
      
      const timer = setTimeout(() => {
        const highlightedElement = document.getElementById(`news-${highlightNewsId}`);
        if (highlightedElement) {
          highlightedElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          setTimeout(() => {
            setHighlightedNewsId(null);
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('highlight');
            router.replace(`/news?${newSearchParams.toString()}`, { scroll: false });
          }, 2500);
        } else {
          setHighlightedNewsId(null);
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('highlight');
          router.replace(`/news?${newSearchParams.toString()}`, { scroll: false });
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [highlightNewsId, pageReady, searchParams, router]);

  const handleOrgTabClick = (orgId) => {
    if (orgId === 'all') {
      router.push('/news');
    } else {
      const targetOrg = organizations.find(org => org.id === orgId);
      if (targetOrg) {
        router.push(`/news?news_org=${targetOrg.acronym || targetOrg.id}`);
      } else {
        router.push('/news');
      }
    }
  };

  const handlePageChange = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/news?${params.toString()}`);
  };

  const calculateTotalPages = (news) => {
    return Math.ceil(news.length / NEWS_PER_PAGE);
  };

  const totalPages = calculateTotalPages(filteredNews);
  const currentNews = filteredNews.slice(
    (currentPage - 1) * NEWS_PER_PAGE,
    currentPage * NEWS_PER_PAGE
  );

  // Using centralized date utility - format remains exactly the same
  const formatDate = (dateString) => {
    return formatDateLong(dateString);
  };

  if (pageLoading || !pageReady || orgLoading || newsLoading) {
    return <Loader small centered />;
  }

  if (newsError || orgError) {
    return (
      <main className={styles.container}>
        <h1 className={styles.heading}>All News</h1>
        <div className={styles.errorContainer}>
          <p>{newsError || orgError}</p>
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
        <span className={styles.breadcrumbCurrent}>News</span>
      </div>

      <h1 className={styles.heading}>All News</h1>

      <div className={styles.orgTabs}>
        <button
          onClick={() => handleOrgTabClick('all')}
          className={`${styles.orgTab} ${!orgFilter ? styles.active : ''}`}
        >
          All
        </button>
        
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleOrgTabClick(org.id)}
            className={`${styles.orgTab} ${orgFilter === org.acronym || orgFilter === org.id.toString() ? styles.active : ''}`}
            title={org.name}
          >
            {org.acronym}
          </button>
        ))}
      </div>

      {filteredNews.length === 0 ? (
       <div className={styles.emptyState}>
         <p>No Announcement found</p>
       </div>
     ) : (
       <>
         <h2 className={styles.sectionHeading}>Most Recent News</h2>
         <div className={styles.resultsInfo}>
           Showing {((currentPage - 1) * NEWS_PER_PAGE) + 1}-{Math.min(currentPage * NEWS_PER_PAGE, filteredNews.length)} of {filteredNews.length} results
         </div>
         <ul className={styles.newsList}>
           {currentNews.map((newsItem) => {
             const imageUrl = newsItem.featured_image || null;
             
             return (
               <li 
                 key={newsItem.id} 
                 id={`news-${newsItem.id}`}
                 className={`${styles.newsItem} ${highlightedNewsId === newsItem.id.toString() ? styles.highlighted : ''}`}
                 onClick={() => router.push(`/news/${newsItem.slug}`)}
               >
                 <div className={styles.newsItemContent}>
                   {imageUrl && (
                     <div className={styles.newsImageContainer}>
                       <Image
                         src={imageUrl}
                         alt={newsItem.title || 'News image'}
                         width={280}
                         height={180}
                         className={styles.newsImage}
                         onError={(e) => {
                           e.target.style.display = 'none';
                         }}
                       />
                     </div>
                   )}
                   <div className={styles.newsTextContent}>
                     <Link
                       href={`/news/${newsItem.slug}`}
                       className={styles.newsTitle}
                     >
                       {newsItem.title}
                     </Link>
                     <p className={styles.newsDescription}>
                       {newsItem.excerpt || newsItem.description}
                     </p>
                     <div className={styles.newsMetadata}>
                       <div>
                         <p className={styles.newsDate}>
                           <em>Published:</em> {formatDate(newsItem.published_at || newsItem.date)} &nbsp;&nbsp; <em>By:</em> {newsItem.orgName || 'Unknown Organization'}
                         </p>
                         <p className={styles.readMore}>Read More</p>
                       </div>
                       {highlightedNewsId === newsItem.id.toString() && (
                         <span className={styles.highlightedBadge}>
                           Highlighted
                         </span>
                       )}
                     </div>
                   </div>
                 </div>
               </li>
             );
           })}
         </ul>
         
         {totalPages > 1 && (
           <Pagination
             currentPage={currentPage}
             totalPages={totalPages}
             onPageChange={handlePageChange}
           />
         )}
       </>
     )}
    </main>
  );
}