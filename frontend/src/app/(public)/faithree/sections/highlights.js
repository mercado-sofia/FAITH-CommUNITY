'use client';

import { useState } from 'react';
import styles from './highlights.module.css';

// Mock data for FAITHree Stories Highlights
const storiesData = [
  {
    id: 1,
    title: "Community Tree Planting Initiative",
    organization: "Green Earth Foundation",
    description: "Join us in our mission to plant 1000 trees across the community this year. This initiative aims to combat climate change and create a greener environment for future generations.",
    status: "active",
    date: "Dec 2024",
    isHighlighted: false
  },
  {
    id: 2,
    title: "Ocean Cleanup Campaign",
    organization: "Blue Wave Alliance",
    description: "Our volunteers have successfully removed over 500kg of plastic waste from local beaches. This ongoing campaign helps protect marine life and preserve our coastal ecosystems.",
    status: "completed",
    date: "Nov 2024",
    isHighlighted: false
  },
  {
    id: 3,
    title: "Renewable Energy Workshop",
    organization: "Solar Future Initiative",
    description: "Educational workshop teaching families how to implement solar energy solutions at home. Over 200 participants learned about sustainable energy alternatives and cost savings.",
    status: "upcoming",
    date: "Jan 2025",
    isHighlighted: false
  },
  {
    id: 4,
    title: "Urban Garden Project",
    organization: "City Green Collective",
    description: "Transforming empty city lots into productive urban gardens. This project provides fresh produce to local communities while promoting sustainable agriculture practices.",
    status: "active",
    date: "Dec 2024",
    isHighlighted: false
  },
  {
    id: 5,
    title: "Wildlife Conservation Program",
    organization: "Nature Protectors",
    description: "Protecting endangered species through habitat restoration and community education. Our efforts have helped increase local wildlife populations by 30% this year.",
    status: "active",
    date: "Dec 2024",
    isHighlighted: false
  },
  {
    id: 6,
    title: "Zero Waste Challenge",
    organization: "Eco Warriors",
    description: "A month-long challenge encouraging families to reduce their waste output. Participants achieved an average 60% reduction in household waste through creative recycling and composting.",
    status: "completed",
    date: "Oct 2024",
    isHighlighted: false
  }
];

export default function Highlights({ onClose }) {
  const [stories, setStories] = useState(storiesData);
  const [selectedStory, setSelectedStory] = useState(null);

  const handleStarClick = (storyId, event) => {
    event.stopPropagation(); // Prevent card click when clicking star
    setStories(prevStories => 
      prevStories.map(story => 
        story.id === storyId 
          ? { ...story, isHighlighted: !story.isHighlighted }
          : story
      )
    );
  };

  const handleCardClick = (story) => {
    setSelectedStory(story);
  };

  const handleCloseDetail = () => {
    setSelectedStory(null);
  };

  return (
    <div className={styles.contentArea}>
      <div className={styles.headerSection}>
        <div className={styles.breadcrumbs}>
          <span>Management</span>
          <span className={styles.separator}>›</span>
          <span>FAITHree</span>
        </div>
        
        <div className={styles.pageHeader}>
          <div className={styles.headerContent}>
            <div className={styles.titleSection}>
              <h1 className={styles.pageTitle}>FAITHree Stories Highlights</h1>
              <p className={styles.pageSubtitle}>
                Environmental stewardship and sustainability initiatives
              </p>
            </div>
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

      <div className={styles.contentSection}>
        <div className={styles.mainContent}>
          <div className={styles.storiesGrid}>
          {stories.map((story) => (
            <div 
              key={story.id} 
              className={styles.storyCard}
              onClick={() => handleCardClick(story)}
            >
              <div className={styles.cardImageContainer}>
                <div className={styles.imagePlaceholder}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <button 
                  className={`${styles.starButton} ${story.isHighlighted ? styles.starButtonActive : ''}`}
                  onClick={(e) => handleStarClick(story.id, e)}
                  title={story.isHighlighted ? "Remove from highlights" : "Add to highlights"}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{story.title}</h3>
                <p className={styles.cardOrganization}>{story.organization}</p>
                <p className={styles.cardDescription}>
                  {story.description}
                </p>
                <div className={styles.cardFooter}>
                  <span className={`${styles.statusBadge} ${styles[story.status]}`}>
                    {story.status.charAt(0).toUpperCase() + story.status.slice(1)}
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
              <div className={styles.modalImageContainer}>
                <div className={styles.modalImagePlaceholder}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              
              <div className={styles.modalInfo}>
                <div className={styles.modalOrganization}>
                  {selectedStory.organization}
                </div>
                <div className={styles.modalDescription}>
                  {selectedStory.description}
                </div>
                <div className={styles.modalDetails}>
                  <div className={styles.modalStatus}>
                    <span className={styles.modalLabel}>Status:</span>
                    <span className={`${styles.modalStatusBadge} ${styles[selectedStory.status]}`}>
                      {selectedStory.status.charAt(0).toUpperCase() + selectedStory.status.slice(1)}
                    </span>
                  </div>
                  <div className={styles.modalDate}>
                    <span className={styles.modalLabel}>Date:</span>
                    <span className={styles.modalDateValue}>{selectedStory.date}</span>
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
