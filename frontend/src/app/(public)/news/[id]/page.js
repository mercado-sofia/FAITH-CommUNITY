"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { usePublicNewsArticle } from "../../../hooks/usePublicData";

export default function NewsDetailPage({ params }) {
  const { id } = params;
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
    return (
      <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
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
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
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
    <main style={{ maxWidth: "800px", margin: "2rem auto", padding: "0 1rem" }}>
      {/* Back to News Link */}
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
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb"
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
            <span>{formatDate(news.date)}</span>
            <span>•</span>
            <span>By {news.orgName || news.orgID || 'Unknown Organization'}</span>
          </div>
        </header>

        {/* News Description */}
        <div style={{
          fontSize: "1.1rem",
          lineHeight: "1.7",
          color: "#374151"
        }}>
          {news.description}
        </div>

        {/* News Footer */}
        <footer style={{
          marginTop: "2rem",
          paddingTop: "1.5rem",
          borderTop: "1px solid #e5e7eb",
          color: "#6b7280",
          fontSize: "0.9rem"
        }}>
          <p>Published on {formatDate(news.created_at)}</p>
        </footer>
      </article>
    </main>
  );
}