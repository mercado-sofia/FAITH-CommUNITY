'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './programDetails.module.css';
import Loader from '../../../../components/ui/Loader/Loader';
import { ContactFormModal } from '../../../../components/ui';
import { getProgramImageUrl, getOrganizationImageUrl, isUnavailableImage } from '@/utils/uploadPaths';
import { UnavailableImagePlaceholder } from '@/components';
import CollaborationDisplay from '../components/CollaborationDisplay/CollaborationDisplay';
import { RelatedPrograms } from '../components';
import { usePublicPageLoader } from '../../hooks/usePublicPageLoader';
import { getProgramStatusByDates } from '@/utils/programStatusUtils';
import { formatDateLong, formatDateShort } from '@/utils/dateUtils';
import { storeRedirectUrl } from '@/utils/redirectUtils';

// Custom functions to preserve exact date formatting for program details
const formatEventDateWithWeekday = (dateString) => {
  if (!dateString) return 'Not specified';
  return formatDateLong(dateString);
};

const formatEventDateShort = (dateString) => {
  if (!dateString) return 'Not specified';
  // Use formatDateShort but extract just month and day
  const formatted = formatDateShort(dateString);
  if (formatted === 'Invalid date' || formatted === 'Not specified') {
    return formatted;
  }
  // Extract month and day from formatDateShort output (e.g., "Sep 18, 2004" -> "Sep 18")
  const parts = formatted.split(',');
  if (parts.length > 0) {
    return parts[0].trim();
  }
  return formatted;
};

export default function ProgramDetailsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [program, setProgram] = useState(null);
  const [otherPrograms, setOtherPrograms] = useState([]);
  const [error, setError] = useState(null);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);
  const [isFetchingProgram, setIsFetchingProgram] = useState(false);
  const [userApplications, setUserApplications] = useState([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`program-${slug}`);


  // Check user authentication status and fetch applications
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      // Check authentication using the auth service instead of localStorage
      try {
        const { getCurrentUser } = await import('@/utils/authService');
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
          fetchUserApplications();
        }
      } catch (error) {
        // User is not authenticated
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch user applications
  const fetchUserApplications = async () => {
    try {
      // No need to check token - cookies handle authentication
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/users/applications`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        }
      });

      if (response.ok) {
        try {
          const data = await response.json();
          setUserApplications(data.applications || []);
        } catch (parseError) {
          // If JSON parsing fails, set empty array
          setUserApplications([]);
        }
      } else {
        setUserApplications([]);
      }
    } catch (error) {
      setUserApplications([]);
    }
  };

  // Fetch program data by slug or ID - only after page is ready
  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        setIsFetchingProgram(true);
        setError(null);
        setHasAttemptedFetch(true);
        
        // Check if slug is a number (ID) or string (slug)
        const isNumeric = !isNaN(slug) && !isNaN(parseFloat(slug));
        let apiUrl;
        
        if (isNumeric) {
          // If it's a number, fetch by ID using the programs list and find the program
          apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/programs`;
        } else {
          // If it's a string, fetch by slug
          apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/programs/slug/${slug}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Program not found');
        }
        
        // Parse JSON with error handling
        let result;
        try {
          result = await response.json();
        } catch (parseError) {
          throw new Error('Invalid response format from server');
        }
        
        let programData;
        if (isNumeric) {
          // Find the program by ID in the programs list
          programData = result.data.find(p => p.id === parseInt(slug));
          if (!programData) {
            throw new Error('Program not found');
          }
        } else {
          // Use the program data directly from slug endpoint
          programData = result.data;
        }
        
        setProgram(programData);
        
        // Fetch other programs from the same organization
        if (programData.organization_id) {
          try {
            const { API_BASE_URL } = await import('@/config/api');
            const otherResponse = await fetch(`${API_BASE_URL || ''}/api/programs/org/${programData.organization_id}/other/${programData.id}`, {
              credentials: 'include', // CRITICAL: Include httpOnly cookies
              headers: {
                'Content-Type': 'application/json',
              }
            });
            if (otherResponse.ok) {
              try {
                const otherResult = await otherResponse.json();
                setOtherPrograms(otherResult.data);
              } catch (parseError) {
                // Silently fail JSON parsing for other programs - not critical
              }
            }
          } catch (err) {
            // Silently fail for other programs - not critical
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsFetchingProgram(false);
      }
    };

    // Only fetch data when page is ready and we have a slug
    if (slug && pageReady && !pageLoading) {
      fetchProgramData();
    }
  }, [slug, pageReady, pageLoading]);

  // Image carousel functions
  const getAllImages = () => {
    if (!program) return [];
    const images = [];
    if (program.image) {
      images.push({ src: getProgramImageUrl(program.image), alt: program.title, isMain: true });
    }
    if (program.additional_images && program.additional_images.length > 0) {
      program.additional_images.forEach((imagePath, index) => {
        images.push({ 
          src: getProgramImageUrl(imagePath, 'additional'), 
          alt: `${program.title} - Image ${index + 1}`, 
          isMain: false 
        });
      });
    }
    return images;
  };

  const goToNextImage = () => {
    const images = getAllImages();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const goToPreviousImage = () => {
    const images = getAllImages();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  const handleApplyClick = () => {
    if (program) {
      // Allow applications for Upcoming and Active programs (if they accept volunteers)
      if (programStatus === 'Upcoming' || programStatus === 'Active') {
        // Check if user has already applied
        const hasApplied = isLoggedIn && userApplications.some(app => app.programId === program.id);
        
        if (hasApplied) {
          // Do nothing - button is disabled
          return;
        }
        
        // Check if program accepts volunteers
        const acceptsVolunteers = program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0';
        if (!acceptsVolunteers) {
          return;
        }
        
        // Always navigate to /apply page (with program parameter)
        const applyUrl = `/apply?program=${program.id}`;
        router.push(applyUrl);
        // Show modal if not logged in
        if (!isLoggedIn && typeof window !== 'undefined') {
          // Store redirect URL before showing modal
          storeRedirectUrl(applyUrl);
          // Use setTimeout to ensure modal shows after navigation
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('showLoginModal', {
              detail: { redirectUrl: applyUrl }
            }));
          }, 100);
        }
      } else if (programStatus !== 'Upcoming' && programStatus !== 'Active' && programStatus !== 'Completed') {
        // Handle Contact Organization button click
        setShowContactModal(true);
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
        return formatEventDateWithWeekday(program.multiple_dates[0]);
      } else {
        const dates = program.multiple_dates.map(date => formatEventDateShort(date));
        return dates.join(', ');
      }
    }
    
    // Check for event start and end dates
    if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date);
      const endDate = new Date(program.event_end_date);
      
      if (startDate.getTime() === endDate.getTime()) {
        // Single day event
        return formatEventDateWithWeekday(program.event_start_date);
      } else {
        // Date range
        return `${formatEventDateWithWeekday(program.event_start_date)} - ${formatEventDateWithWeekday(program.event_end_date)}`;
      }
    }
    
    // Check for single start date
    if (program.event_start_date) {
      return formatEventDateWithWeekday(program.event_start_date);
    }
    
    // No event date set - return null to hide the section
    return null;
  };

  const getApplicationContent = (programStatus) => {
    if (!program) return {
      title: 'Program Not Found',
      text: 'The program you are looking for could not be found.',
      buttonText: 'Go Back',
      icon: '❓',
      isDisabled: true
    };

    // Check if user has already applied to this program
    const hasApplied = isLoggedIn && userApplications.some(app => app.programId === program.id);

    // Check if program accepts volunteers (admin can close volunteer applications)
    // Handle both boolean and numeric values (0/1 from database)
    const acceptsVolunteers = program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0';

    // Block applications for Completed programs (regardless of accepts_volunteers setting)
    if (programStatus === 'Completed') {
      return null;
    }

    // For Active programs, only show apply button if they accept volunteers
    if (programStatus === 'Active') {
      if (!acceptsVolunteers) {
        return null;
      }
      
      if (hasApplied) {
        return {
          title: 'Application Submitted',
          text: 'You have already applied to this program. Your application is being reviewed and you will be notified of the status soon.',
          buttonText: 'Already Applied',
          icon: '📝',
          isDisabled: true
        };
      }
      
      return {
        title: 'Ready to Join?',
        text: 'Take the first step towards making a positive impact in your community. Apply now and become part of this meaningful program.',
        buttonText: 'Apply Now',
        icon: '✨',
        isDisabled: false
      };
    }

    // For Upcoming programs, only show apply button if they accept volunteers
    if (programStatus === 'Upcoming') {
      if (!acceptsVolunteers) {
        return null;
      }
      
      if (hasApplied) {
        return {
          title: 'Application Submitted',
          text: 'You have already applied to this program. Your application is being reviewed and you will be notified of the status soon.',
          buttonText: 'Already Applied',
          icon: '📝',
          isDisabled: true
        };
      }
      
      return {
        title: 'Ready to Join?',
        text: 'Take the first step towards making a positive impact in your community. Apply now and become part of this meaningful program.',
        buttonText: 'Apply Now',
        icon: '✨',
        isDisabled: false
      };
    }

    // For any other status, don't show apply button
    return null;
  };

  if (pageLoading || !pageReady || isFetchingProgram) {
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

  if (!program && hasAttemptedFetch && !isFetchingProgram) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorText}>Program not found.</div>
          <button 
            onClick={() => router.push('/programs')}
            className={styles.applyButton}
            style={{ marginTop: '1rem' }}
          >
            Back to Programs
          </button>
        </div>
      </div>
    );
  }

  // Don't render program content if we don't have program data yet
  if (!program) {
    return <Loader small centered />;
  }

  const programStatus = getProgramStatusByDates(program);
  const applicationContent = getApplicationContent(programStatus);

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
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
            href="/programs" 
            className={styles.breadcrumbLink}
          >
            Program
          </Link>
          <span className={styles.breadcrumbSeparator}>›</span>
          <span className={styles.breadcrumbCurrent}>{program.title}</span>
        </div>

        <div className={styles.pageGrid}>
          {/* Main Content - Program Details */}
          <div className={styles.main}>
            <div className={styles.programInfo}>
              {/* Program Title - moved to top */}
              <h2 className={styles.programTitle}>{program.title}</h2>
              
              {/* Status Badge - moved after title */}
              <div className={styles.statusContainer}>
                <span className={`${styles.statusBadge} ${getStatusClass(programStatus)}`}>
                  {programStatus}
                </span>
              </div>
              
              <div className={styles.programDetailsSection}>
                <div className={styles.metaInfo}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Category</span>
                    <span className={styles.metaValue}>{program.category}</span>
                  </div>
                  
                  {formatEventDates(program) && (
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Date</span>
                      <span className={styles.metaValue}>
                        {formatEventDates(program)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className={styles.programDescription}>
                  <h3 className={styles.descriptionTitle}>About This Program</h3>
                  <p className={styles.descriptionText}>{program.description}</p>
                </div>
                
                {/* Apply Button - positioned after description */}
                {applicationContent && (
                  <div className={styles.simpleApplyButtonContainer}>
                    <button 
                      onClick={handleApplyClick}
                      className={`${styles.simpleApplyButton} ${
                        applicationContent.isDisabled 
                          ? applicationContent.buttonText === 'Already Applied' 
                            ? styles.applyButtonAlreadyApplied 
                            : styles.applyButtonDisabled 
                          : ''
                      }`}
                      disabled={applicationContent.isDisabled}
                    >
                      Apply for this Program
                    </button>
                  </div>
                )}
              </div>
            </div>
            
          </div>

          {/* Right Column - Program Image Carousel */}
          <div className={styles.rightColumn}>
            {(() => {
              const images = getAllImages();
              if (images.length === 0) return null;
              
              const currentImage = images[currentImageIndex];
              
              return (
                <div className={styles.programImageContainer}>
                  <div className={styles.imageCarousel}>
                    <Image 
                      src={currentImage.src} 
                      alt={currentImage.alt} 
                      width={600} 
                      height={400}
                      className={styles.programImage}
                    />
                    
                    {/* Navigation arrows - only show if more than 1 image */}
                    {images.length > 1 && (
                      <>
                        <button 
                          className={styles.carouselArrow} 
                          onClick={goToPreviousImage}
                          aria-label="Previous image"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          className={styles.carouselArrow} 
                          onClick={goToNextImage}
                          aria-label="Next image"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </>
                    )}
                    
                    {/* Dots navigation - only show if more than 1 image */}
                    {images.length > 1 && (
                      <div className={styles.carouselDots}>
                        {images.map((_, index) => (
                          <button
                            key={index}
                            className={`${styles.carouselDot} ${index === currentImageIndex ? styles.carouselDotActive : ''}`}
                            onClick={() => goToImage(index)}
                            aria-label={`Go to image ${index + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Organizations Row - Full Width */}
        <div className={styles.organizationsRow}>
          {/* Host Organization */}
          {(program.organization_name || program.organization_acronym) && (
            <div className={styles.organizationSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 21H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 21V7L13 2L21 7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className={styles.sectionTitle}>Host Organization</h3>
              </div>
              
              <div className={styles.organizationCard}>
                <Link 
                  href={`/programs/org/${program.organization_acronym || program.organization_id}`}
                  className={styles.orgLink}
                >
                  <div className={styles.orgContent}>
                    {program.orgLogo ? (
                      <div className={styles.orgLogoContainer}>
                        {(() => {
                          const orgImageUrl = getOrganizationImageUrl(program.orgLogo);
                          if (isUnavailableImage(orgImageUrl)) {
                            return (
                              <UnavailableImagePlaceholder 
                                width="56px" 
                                height="56px" 
                                text="Logo Unavailable"
                                className={styles.orgLogo}
                              />
                            );
                          }
                          return (
                            <Image 
                              src={orgImageUrl} 
                              alt={`${program.organization_name || program.organization_acronym} logo`}
                              width={56} 
                              height={56}
                              className={styles.orgLogo}
                              onError={(e) => {
                                e.target.src = '/assets/icons/placeholder.svg';
                              }}
                            />
                          );
                        })()}
                      </div>
                    ) : (
                      <div className={styles.orgLogoContainer}>
                        <UnavailableImagePlaceholder 
                          width="56px" 
                          height="56px" 
                          text="No Logo"
                          className={styles.orgLogo}
                        />
                      </div>
                    )}
                    <div className={styles.orgDetails}>
                      <div className={styles.orgName}>
                        {program.organization_name || program.organization_acronym}
                        {program.organization_acronym && program.organization_name && (
                          <span className={styles.orgAcronymInName}> ({program.organization_acronym})</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.orgArrow}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
          
          {/* Collaboration Display */}
          {(program.is_collaborative === 1 || program.is_collaborative === true) && program.collaborators && program.collaborators.length > 0 && (
            <CollaborationDisplay 
              collaborators={program.collaborators}
            />
          )}
        </div>
      </div>

      {/* Related Programs from Same Organization */}
      <RelatedPrograms 
        otherPrograms={otherPrograms}
        organizationName={program.organization_name}
        organizationAcronym={program.organization_acronym}
        organizationId={program.organization_id}
      />

      {/* Contact Organization Modal */}
      <ContactFormModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        organizationName={program?.organization_name || program?.organization_acronym || 'the organization'}
        organizationId={program?.organization_id}
        programTitle={program?.title}
      />
    </div>
  );
}