"use client";

import { useState, useEffect, use } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePublicNewsArticle } from "../../../../hooks/usePublicData";
import Loader from "../../../../components/Loader";

export default function NewsDetailPage({ params }) {
  const { id } = use(params);
  const [pageReady, setPageReady] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  
  const { article: news, isLoading: loading, error } = usePublicNewsArticle(id);

  // Add extra 1 second delay only for first visits
  useEffect(() => {
    if (!loading) {
      const extraDelay = isFirstVisit ? 1000 : 0;
      const timer = setTimeout(() => {
        setPageReady(true);
        setIsFirstVisit(false);
      }, extraDelay);
      
      return () => clearTimeout(timer);
    }
  }, [loading, isFirstVisit]);

  // Handle 404 case
  if (!loading && !news) {
    notFound();
  }

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

  if (loading || !pageReady) {
    return <Loader small centered />;
  }

  if (error) {
    return (
      <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc3545' }}>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#167c59',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!news) {
    notFound();
  }

  return (
    <main style={{ 
      maxWidth: "900px", 
      margin: "2rem auto", 
      padding: "0 1rem",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <style jsx global>{`
        .news-content h1, .news-content h2, .news-content h3 {
          color: #1f2937;
          margin: 1.5rem 0 1rem 0;
          font-weight: 600;
        }
        .news-content h1 { font-size: 1.875rem; }
        .news-content h2 { font-size: 1.5rem; }
        .news-content h3 { font-size: 1.25rem; }
        .news-content p {
          margin: 1rem 0;
          line-height: 1.8;
        }
        .news-content ul, .news-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }
        .news-content li {
          margin: 0.5rem 0;
          line-height: 1.7;
        }
        .news-content blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          border-left: 4px solid #167c59;
          background-color: #f9fafb;
          font-style: italic;
          border-radius: 0 8px 8px 0;
        }
        .news-content strong {
          font-weight: 600;
          color: #1f2937;
        }
        .news-content em {
          font-style: italic;
          color: #4b5563;
        }
        .news-content a {
          color: #167c59;
          text-decoration: underline;
        }
        .news-content a:hover {
          color: #065f46;
        }
        .news-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .news-content pre {
          background-color: #f3f4f6;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
        }
        .news-content code {
          background-color: #f3f4f6;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
        }
      `}</style>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/news"
          style={{
            color: "#167c59",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontWeight: "500"
          }}
        >
          ← Back to All News
        </Link>
      </div>

      {/* News Content */}
      <article style={{
        background: "white",
        borderRadius: "16px",
        padding: "2.5rem",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        border: "1px solid #e5e7eb",
        position: "relative"
      }}>
        {/* News Header */}
        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: "#111827",
            margin: "0 0 1rem 0",
            lineHeight: "1.2"
          }}>
            {news.title}
          </h1>
          
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            color: "#6b7280",
            fontSize: "0.9rem"
          }}>
            <span>{formatDate(news.published_at || news.date)}</span>
            <span>•</span>
            <span>By {news.orgName || news.orgID || 'Unknown Organization'}</span>
          </div>
        </header>

        {/* Featured Image - Display prominently after header */}
        {news.featured_image && (() => {
          const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
          const imagePath = news.featured_image.startsWith('/') ? news.featured_image : `/${news.featured_image}`;
          const imageUrl = `${baseUrl}${imagePath}`;
          
          return (
            <div style={{
              marginBottom: "2rem",
              textAlign: "center",
              overflow: "hidden",
              borderRadius: "12px",
              boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)"
            }}>
              <Image
                src={imageUrl}
                alt={news.title || 'News image'}
                width={800}
                height={450}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "450px",
                  objectFit: "cover",
                  display: "block"
                }}
                priority
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          );
        })()}

        {/* News Content */}
        <div style={{
          fontSize: "1.1rem",
          lineHeight: "1.8",
          color: "#374151"
        }}>
          {/* Show excerpt if available */}
          {news.excerpt && (
            <div style={{
              fontSize: "1.25rem",
              fontWeight: "500",
              color: "#4b5563",
              marginBottom: "2rem",
              padding: "1.5rem",
              backgroundColor: "#f8fafc",
              borderLeft: "5px solid #167c59",
              borderRadius: "0 12px 12px 0",
              fontStyle: "italic",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
            }}>
              &ldquo;{news.excerpt}&rdquo;
            </div>
          )}
          
          {/* Main content with proper styling for rich text */}
          <div 
            style={{
              marginBottom: "2rem"
            }}
            className="news-content"
            dangerouslySetInnerHTML={{ __html: news.content || news.description }} 
          />
        </div>

        <footer style={{
          marginTop: "2rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #e5e7eb",
          color: "#6b7280",
          fontSize: "0.9rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div>
            <p style={{ margin: 0 }}>Published on {formatDate(news.published_at || news.created_at)}</p>
          </div>
          
          {/* Back to News Link in Footer */}
          <Link
            href="/news"
            style={{
              color: "#167c59",
              textDecoration: "none",
              fontWeight: "500",
              padding: "0.5rem 1rem",
              border: "1px solid #167c59",
              borderRadius: "6px",
              transition: "all 0.2s",
              fontSize: "0.9rem"
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#167c59";
              e.target.style.color = "white";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#167c59";
            }}
          >
            View All News
          </Link>
        </footer>
      </article>
    </main>
  );
}