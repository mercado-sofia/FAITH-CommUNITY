'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './highlights.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function Highlights({ onClose, organizationId = null }) {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [organizationName, setOrganizationName] = useState(null);

  // Fetch approved highlights from API
  const fetchHighlights = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/highlights/public/approved`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch highlights');
      }
      
      const data = await response.json();
      const highlights = data.highlights || [];
      
      // Debug: Log raw API data to check for program_title
      if (highlights.length > 0) {
        console.log('Highlights API response sample:', {
          count: highlights.length,
          sample: {
            id: highlights[0].id,
            title: highlights[0].title,
            program_id: highlights[0].program_id,
            program_title: highlights[0].program_title,
            raw: highlights[0]
          }
        });
      }
      
      // Filter by organization if organizationId is provided
      let filteredHighlights = highlights;
      if (organizationId) {
        filteredHighlights = highlights.filter(h => h.organization_id === organizationId);
        // Set organization name for display
        if (filteredHighlights.length > 0) {
          setOrganizationName(filteredHighlights[0].organization_name || null);
        } else {
          setOrganizationName(null);
        }
      } else {
        setOrganizationName(null);
      }
      
      // Transform API data to match expected format and ensure unique IDs
      const transformedHighlights = filteredHighlights.map((highlight, index) => ({
        id: `${highlight.id || 'unknown'}-${index}`,
        originalId: highlight.id,
        title: highlight.title,
        organization: highlight.organization_name || 'Unknown Organization',
        organization_acronym: highlight.organization_acronym || '',
        description: highlight.description,
        program_title: highlight.program_title || null,
        program_id: highlight.program_id || null,
        date: new Date(highlight.created_at).toLocaleDateString('en-US', { 
          month: 'short', 
          year: 'numeric' 
        }),
        media: highlight.media || []
      }));
      
      setStories(transformedHighlights);
      setError(null);
    } catch (error) {
      setError('Failed to load highlights');
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // Load highlights on component mount and when organizationId changes
  useEffect(() => {
    fetchHighlights();
  }, [fetchHighlights]);

  // Auto-refresh every 30 seconds to catch new approvals
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHighlights();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchHighlights]);

  const handleCardClick = (story) => {
    setSelectedStory(story);
  };

  const handleCloseDetail = () => {
    setSelectedStory(null);
  };

  return (
    <div className={styles.contentArea}>
      <div className={styles.headerSection}>
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 className={styles.pageTitle}>
                {organizationName ? `${organizationName} Highlights` : 'FAITHree Stories Highlights'}
              </h1>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.closeButton}
                onClick={onClose}
                title="Close FAITHree Stories Highlights"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <div className={styles.mainContent}>
          <div className={styles.storiesGrid}>
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.skeletonImage}></div>
                </div>
                <div className={styles.cardContent}>
                  <div className={styles.skeletonTitle}></div>
                  <div className={styles.skeletonOrganization}></div>
                  <div className={styles.skeletonDescription}></div>
                  <div className={styles.skeletonDescription}></div>
                  <div className={styles.cardFooter}>
                    <div className={styles.skeletonBadge}></div>
                    <div className={styles.skeletonDate}></div>
                  </div>
                </div>
              </div>
            ))
          ) : error ? (
            <div className={styles.errorMessage}>
              <p>{error}</p>
            </div>
          ) : null}
          {!isLoading && stories.map((story, index) => (
            <div 
              key={`story-${story.originalId || 'unknown'}-${index}`} 
              className={styles.storyCard}
              onClick={() => handleCardClick(story)}
            >
              <div className={styles.cardImageContainer}>
                {story.media && story.media.length > 0 && story.media[0].url ? (
                  <Image 
                    src={story.media[0].url} 
                    alt={story.title}
                    fill
                    className={styles.cardImage}
                    sizes="350px"
                  />
                ) : null}
                <div className={styles.imagePlaceholder} style={{ display: story.media && story.media.length > 0 && story.media[0].url ? 'none' : 'flex' }}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{story.title}</h3>
                <p className={styles.cardOrganization}>{story.organization}</p>
                {/* Associated Program */}
                {(story.program_title || story.program_id) && (
                  <p style={{ marginTop: '4px', marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                    <span style={{ fontWeight: '500' }}>Program:</span> {story.program_title || `Program ID: ${story.program_id}`}
                  </p>
                )}
                <p className={styles.cardDescription}>
                  {story.description}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.organizationBadge}>
                    {story.organization_acronym || story.organization}
                  </span>
                  <span className={styles.cardDate}>{story.date}</span>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Story Detail Modal */}
      {selectedStory && (
        <div className={styles.storyDetailModal}>
          <div className={styles.modalOverlay} onClick={handleCloseDetail}></div>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedStory.title}</h2>
              <button
                className={styles.modalCloseButton}
                onClick={handleCloseDetail}
                title="Close story details"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {/* Description Section */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Description</h3>
                <p className={styles.modalDescriptionText}>
                  {selectedStory.description || 'No description provided.'}
                </p>
              </div>

              {/* Media Gallery */}
              {selectedStory.media && selectedStory.media.length > 0 && (
                <div className={styles.modalSection}>
                  <h3 className={styles.modalSectionTitle}>
                    Media ({selectedStory.media.length} {selectedStory.media.length === 1 ? 'file' : 'files'})
                  </h3>
                  
                  <div className={styles.modalImageGallery}>
                    <div className={styles.modalMainImage}>
                      {selectedStory.media[0] && (
                        <Image
                          src={selectedStory.media[0].url}
                          alt={`${selectedStory.title} image`}
                          fill
                          className={styles.modalMainImageContent}
                          sizes="800px"
                        />
                      )}
                      <div className={styles.modalImagePlaceholder} style={{ display: selectedStory.media[0] ? 'none' : 'flex' }}>
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                    
                    {selectedStory.media.length > 1 && (
                      <div className={styles.modalImageThumbnails}>
                        {selectedStory.media.map((item, index) => (
                          <div
                            key={index}
                            className={`${styles.modalThumbnail} ${index === 0 ? styles.modalActiveThumbnail : ''}`}
                          >
                            <Image
                              src={item.url}
                              alt={`Thumbnail ${index + 1}`}
                              fill
                              className={styles.modalThumbnailImage}
                              sizes="100px"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Details Section */}
              <div className={styles.modalSection}>
                <h3 className={styles.modalSectionTitle}>Details</h3>
                <div className={styles.modalMetadata}>
                  <div className={styles.modalMetaItem}>
                    <svg className={styles.modalMetaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 21V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V21M19 21H5M19 21H21M5 21H3M9 7H15M9 11H15M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.modalMetaLabel}>Organization:</span>
                    <span className={styles.modalMetaValue}>{selectedStory.organization}</span>
                  </div>
                  {(selectedStory.program_title || selectedStory.program_id) && (
                    <div className={styles.modalMetaItem}>
                      <svg className={styles.modalMetaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 7H17M7 12H17M7 17H12M3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={styles.modalMetaLabel}>Program:</span>
                      <span className={styles.modalMetaValue}>{selectedStory.program_title || `Program ID: ${selectedStory.program_id}`}</span>
                    </div>
                  )}
                  <div className={styles.modalMetaItem}>
                    <svg className={styles.modalMetaIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 7V3M16 7V3M3 11H21M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className={styles.modalMetaLabel}>Date:</span>
                    <span className={styles.modalMetaValue}>{selectedStory.date}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
