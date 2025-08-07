"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function AllNewsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orgFilter = searchParams.get("news_org");
  
  const [news, setNews] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch organizations for tabs
  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/organizations`);
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const result = await response.json();
      if (result.success) {
        setOrganizations(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setOrganizations([]);
    }
  };

  // Fetch news data
  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE_URL}/api/news`;
      if (orgFilter) {
        url = `${API_BASE_URL}/api/news/org/${orgFilter}`;
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

  useEffect(() => {
    fetchNews();
  }, [orgFilter]);

  const handleOrgTabClick = (orgId) => {
    if (orgId === 'all') {
      router.push('/news');
    } else {
      router.push(`/news?news_org=${orgId}`);
    }
  };

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

  if (loading) {
    return (
      <main style={{ maxWidth: "900px", margin: "2rem auto", padding: "0 1rem" }}>
        <h1>All News</h1>
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
      <main style={{ maxWidth: "900px", margin: "2rem auto", padding: "0 1rem" }}>
        <h1>All News</h1>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#dc3545' }}>
          <p>{error}</p>
          <button 
            onClick={fetchNews}
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

  return (
    <main style={{ maxWidth: "900px", margin: "2rem auto", padding: "0 1rem" }}>
      <h1>All News</h1>

      {/* Organization Tabs */}
      <div style={{ 
        marginBottom: "2rem", 
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem"
      }}>
        <button
          onClick={() => handleOrgTabClick('all')}
          style={{
            padding: "0.75rem 1.5rem",
            background: !orgFilter ? "#167c59" : "#f3f4f6",
            color: !orgFilter ? "white" : "#374151",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "500",
            transition: "all 0.2s ease"
          }}
        >
          All Organizations
        </button>
        
        {organizations.map((org) => (
          <button
            key={org.id}
            onClick={() => handleOrgTabClick(org.id)}
            style={{
              padding: "0.75rem 1.5rem",
              background: orgFilter === org.id ? "#167c59" : "#f3f4f6",
              color: orgFilter === org.id ? "white" : "#374151",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "500",
              transition: "all 0.2s ease"
            }}
            title={org.name}
          >
            {org.acronym}
          </button>
        ))}
      </div>

      {/* News List */}
      {news.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <p>No announcements found{orgFilter && ` for ${orgFilter}`}.</p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {news.map((newsItem) => (
            <li key={newsItem.id} style={{ 
              marginBottom: "2rem",
              padding: "1.5rem",
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                <p style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>
                  {formatDate(newsItem.date)} / By {newsItem.orgName || newsItem.orgID || 'Unknown Organization'}
                </p>
              </div>
              <Link
                href={`/news/${newsItem.id}`}
                style={{
                  fontWeight: "bold",
                  fontSize: "1.1rem",
                  color: "#167c59",
                  textDecoration: "none",
                  display: "block",
                  marginBottom: "0.5rem"
                }}
              >
                {newsItem.title}
              </Link>
              <p style={{ margin: 0, color: "#374151", lineHeight: "1.6" }}>
                {newsItem.description && newsItem.description.length > 150
                  ? `${newsItem.description.substring(0, 150)}...`
                  : newsItem.description}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}