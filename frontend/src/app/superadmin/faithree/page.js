'use client';

import { useState } from 'react';
import styles from './faithree.module.css';

export default function FAITHreePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const toggleContent = () => {
    setIsContentVisible(!isContentVisible);
  };

  return (
    <div className={styles.faithreeContainer}>
      {/* Eco-themed background */}
      <div className={styles.ecoBackground}>
        {/* Sky with clouds */}
        <div className={styles.sky}>
          <div className={styles.cloud} style={{ '--delay': '0s', '--duration': '20s' }}></div>
          <div className={styles.cloud} style={{ '--delay': '5s', '--duration': '25s' }}></div>
          <div className={styles.cloud} style={{ '--delay': '10s', '--duration': '30s' }}></div>
        </div>
        
        {/* Rolling hills */}
        <div className={styles.hills}>
          <div className={styles.hill} style={{ '--hill-index': '1' }}></div>
          <div className={styles.hill} style={{ '--hill-index': '2' }}></div>
          <div className={styles.hill} style={{ '--hill-index': '3' }}></div>
          <div className={styles.hill} style={{ '--hill-index': '4' }}></div>
        </div>
        
        {/* Trees */}
        <div className={styles.trees}>
          <div className={styles.tree} style={{ '--tree-index': '1', '--x': '10%' }}></div>
          <div className={styles.tree} style={{ '--tree-index': '2', '--x': '25%' }}></div>
          <div className={styles.tree} style={{ '--tree-index': '3', '--x': '40%' }}></div>
          <div className={styles.tree} style={{ '--tree-index': '4', '--x': '60%' }}></div>
          <div className={styles.tree} style={{ '--tree-index': '5', '--x': '75%' }}></div>
          <div className={styles.tree} style={{ '--tree-index': '6', '--x': '90%' }}></div>
        </div>
        
        {/* Water body */}
        <div className={styles.water}></div>
      </div>
      
      {/* Toggle Button */}
      <div className={styles.toggleButtonContainer}>
        <button 
          className={styles.toggleButton}
          onClick={toggleContent}
        >
          <div className={styles.buttonIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
              <path d="M19 15L20.09 18.26L24 19L20.09 19.74L19 23L17.91 19.74L14 19L17.91 18.26L19 15Z" fill="currentColor"/>
              <path d="M5 15L6.09 18.26L10 19L6.09 19.74L5 23L3.91 19.74L0 19L3.91 18.26L5 15Z" fill="currentColor"/>
            </svg>
          </div>
          <span>FAITHree Stories Highlights</span>
          <div className={`${styles.chevron} ${isContentVisible ? styles.chevronUp : styles.chevronDown}`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
      
      {/* Content area - only visible when toggled */}
      {isContentVisible && (
        <div className={styles.contentArea}>
          <div className={styles.breadcrumbs}>
            <span>Management</span>
            <span className={styles.separator}>›</span>
            <span>FAITHree</span>
          </div>
          
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>FAITHree Stories Highlights</h1>
            <p className={styles.pageSubtitle}>
              Environmental stewardship and sustainability initiatives
            </p>
          </div>
          
          <div className={styles.mainContent}>
            <div className={styles.storiesGrid}>
              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Community Tree Planting Initiative</h3>
                  <p className={styles.cardOrganization}>Green Earth Foundation</p>
                  <p className={styles.cardDescription}>
                    Join us in our mission to plant 1000 trees across the community this year. 
                    This initiative aims to combat climate change and create a greener environment for future generations.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.active}`}>Active</span>
                    <span className={styles.cardDate}>Dec 2024</span>
                  </div>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Ocean Cleanup Campaign</h3>
                  <p className={styles.cardOrganization}>Blue Wave Alliance</p>
                  <p className={styles.cardDescription}>
                    Our volunteers have successfully removed over 500kg of plastic waste from local beaches. 
                    This ongoing campaign helps protect marine life and preserve our coastal ecosystems.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.completed}`}>Completed</span>
                    <span className={styles.cardDate}>Nov 2024</span>
                  </div>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Renewable Energy Workshop</h3>
                  <p className={styles.cardOrganization}>Solar Future Initiative</p>
                  <p className={styles.cardDescription}>
                    Educational workshop teaching families how to implement solar energy solutions at home. 
                    Over 200 participants learned about sustainable energy alternatives and cost savings.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.upcoming}`}>Upcoming</span>
                    <span className={styles.cardDate}>Jan 2025</span>
                  </div>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Urban Garden Project</h3>
                  <p className={styles.cardOrganization}>City Green Collective</p>
                  <p className={styles.cardDescription}>
                    Transforming empty city lots into productive urban gardens. 
                    This project provides fresh produce to local communities while promoting sustainable agriculture practices.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.active}`}>Active</span>
                    <span className={styles.cardDate}>Dec 2024</span>
                  </div>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Wildlife Conservation Program</h3>
                  <p className={styles.cardOrganization}>Nature Protectors</p>
                  <p className={styles.cardDescription}>
                    Protecting endangered species through habitat restoration and community education. 
                    Our efforts have helped increase local wildlife populations by 30% this year.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.active}`}>Active</span>
                    <span className={styles.cardDate}>Dec 2024</span>
                  </div>
                </div>
              </div>

              <div className={styles.storyCard}>
                <div className={styles.cardImageContainer}>
                  <div className={styles.imagePlaceholder}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>Zero Waste Challenge</h3>
                  <p className={styles.cardOrganization}>Eco Warriors</p>
                  <p className={styles.cardDescription}>
                    A month-long challenge encouraging families to reduce their waste output. 
                    Participants achieved an average 60% reduction in household waste through creative recycling and composting.
                  </p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusBadge} ${styles.completed}`}>Completed</span>
                    <span className={styles.cardDate}>Oct 2024</span>
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
