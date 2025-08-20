'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './programDetails.module.css';
import { usePublicPrograms } from '../../../../../hooks/usePublicData';
import Loader from '../../../../../components/Loader';
import { getProgramImageUrl } from '../../../../../utils/uploadPaths';

export default function ProgramDetailsPage() {
  const { programID } = useParams();
  const router = useRouter();
  const [pageReady, setPageReady] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Use SWR hook for data fetching
  const { programs, isLoading: loading, error } = usePublicPrograms();

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        JSON.parse(storedUserData);
        setIsLoggedIn(true);
      } catch (error) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Find the specific program
  const program = programs.find(p => p.id === Number(programID));

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

  const handleApplyClick = () => {
    if (program.status === 'Upcoming') {
      if (!isLoggedIn) {
        // Show login modal for non-authenticated users
        window.dispatchEvent(new CustomEvent('showLoginModal'));
      } else {
        router.push(`/apply?program=${programID}`);
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Upcoming':
        return styles.statusUpcoming;
      case 'Active':
        return styles.statusActive;
      case 'Completed':
        return styles.statusCompleted;
      default:
        return styles.statusCompleted;
    }
  };

  const formatEventDates = (program) => {
    // Check for multiple dates first
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return new Date(program.multiple_dates[0]).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        const dates = program.multiple_dates.map(date => 
          new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        );
        return `Multiple Dates: ${dates.join(', ')}`;
      }
    }
    
    // Check for event start and end dates
    if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      if (startDate.getTime() === endDate.getTime()) {
        // Single day event
        return startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        // Date range
        return `${startDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })} - ${endDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`;
      }
    }
    
    // Check for single start date
    if (program.event_start_date) {
      return new Date(program.event_start_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return 'Date not specified';
  };

  const getApplicationContent = () => {
    switch (program.status) {
      case 'Upcoming':
        return {
          title: 'Ready to Join?',
          text: 'Take the first step towards making a positive impact in your community. Apply now and become part of this meaningful program.',
          buttonText: 'Apply Now',
          icon: '✨',
          isDisabled: false
        };
      case 'Active':
        return {
          title: 'Program in Progress',
          text: 'This program is currently active and running. Applications are no longer being accepted for this session.',
          buttonText: 'Applications Closed',
          icon: '🔄',
          isDisabled: true
        };
      case 'Completed':
        return {
          title: 'Program Completed',
          text: 'This program has been successfully completed. Thank you to all participants who made it possible!',
          buttonText: 'Program Finished',
          icon: '✅',
          isDisabled: true
        };
      default:
        return {
          title: 'Program Status Unknown',
          text: 'The current status of this program is unclear. Please contact the organization for more information.',
          buttonText: 'Contact Organization',
          icon: '❓',
          isDisabled: true
        };
    }
  };

  if (loading || !pageReady) {
    return <Loader small centered />;
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>{error}</div>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>Program not found.</div>
        </div>
      </div>
    );
  }

  const applicationContent = getApplicationContent();

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Program Details</h1>
          <p className={styles.pageSubtitle}>Discover opportunities to make a difference</p>
        </div>
        
        <div className={styles.contentGrid}>
          {/* Left Panel - Program Content */}
          <div className={styles.programContent}>
            {program.image && (
              <Image 
                src={getProgramImageUrl(program.image)} 
                alt={program.title} 
                width={600} 
                height={400}
                className={styles.programImage}
              />
            )}
            
            <div className={styles.programInfo}>
              <h2 className={styles.programTitle}>{program.title}</h2>
              
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Category</span>
                  <span className={styles.metaValue}>{program.category}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status</span>
                  <span className={`${styles.statusBadge} ${getStatusClass(program.status)}`}>
                    {program.status}
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Event Date</span>
                  <span className={styles.metaValue}>
                    {formatEventDates(program)}
                  </span>
                </div>
              </div>
              
              <div className={styles.programDescription}>
                <h3 className={styles.descriptionTitle}>About This Program</h3>
                <p className={styles.descriptionText}>{program.description}</p>
              </div>
              
              {/* Additional Images Gallery */}
              {program.additional_images && program.additional_images.length > 0 && (
                <div className={styles.additionalImagesSection}>
                  <h3 className={styles.additionalImagesTitle}>Program Gallery</h3>
                  <div className={styles.additionalImagesGrid}>
                    {program.additional_images.map((imagePath, index) => (
                      <div key={index} className={styles.additionalImageContainer}>
                        <Image 
                          src={getProgramImageUrl(imagePath, 'additional')} 
                          alt={`${program.title} - Image ${index + 1}`}
                          width={200} 
                          height={150}
                          className={styles.additionalImage}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(program.orgName || program.orgID) && (
                <div className={styles.organizationSection}>
                  <h3 className={styles.orgTitle}>Host Organization</h3>
                  <div className={styles.orgInfo}>
                    {program.icon && (
                      <Image 
                        src={program.icon ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${program.icon}` : '/logo/faith_community_logo.png'} 
                        alt={`${program.orgName || program.orgID} logo`}
                        width={48} 
                        height={48}
                        className={styles.orgLogo}
                        onError={(e) => {
                          e.target.src = '/logo/faith_community_logo.png';
                        }}
                      />
                    )}
                    <div className={styles.orgDetails}>
                      <div className={styles.orgName}>{program.orgName || program.orgID}</div>
                      {program.orgID && program.orgName && (
                        <div className={styles.orgId}>{program.orgID}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Application Invitation */}
          <div className={styles.applicationPanel}>
            <div className={styles.invitationContent}>
              <div className={styles.invitationIcon}>
                {applicationContent.icon}
              </div>
              <h3 className={styles.invitationTitle}>{applicationContent.title}</h3>
              <p className={styles.invitationText}>
                {applicationContent.text}
              </p>
              <button 
                onClick={handleApplyClick}
                className={`${styles.applyButton} ${applicationContent.isDisabled ? styles.applyButtonDisabled : ''}`}
                disabled={applicationContent.isDisabled}
              >
                {applicationContent.buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}