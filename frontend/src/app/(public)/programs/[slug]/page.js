'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './programDetails.module.css';
import Loader from '../../../../components/ui/Loader/Loader';
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths';
import OtherProgramsCarousel from '../components/OtherProgramsCarousel/OtherProgramsCarousel';
import CollaborationDisplay from '../components/CollaborationDisplay/CollaborationDisplay';
import { usePublicPageLoader } from '../../hooks/usePublicPageLoader';

// Custom functions to preserve exact date formatting for program details
const formatEventDateWithWeekday = (dateString) => {
  if (!dateString) return 'Not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
};

const formatEventDateShort = (dateString) => {
  if (!dateString) return 'Not specified';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
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
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`program-${slug}`);

  // Check user authentication status and fetch applications
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('userToken');
      const storedUserData = localStorage.getItem('userData');
      
      if (token && storedUserData) {
        try {
          JSON.parse(storedUserData);
          setIsLoggedIn(true);
          fetchUserApplications();
        } catch (error) {
          // Clear corrupted data using centralized cleanup
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
        }
      }
    };
    
    checkAuth();
  }, []);

  // Fetch user applications
  const fetchUserApplications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        setUserApplications([]);
        return;
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/users/applications`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserApplications(data.applications || []);
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
        
        const result = await response.json();
        
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
            const otherResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/programs/org/${programData.organization_id}/other/${programData.id}`);
            if (otherResponse.ok) {
              const otherResult = await otherResponse.json();
              setOtherPrograms(otherResult.data);
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


  const handleApplyClick = () => {
    if (program && program.status === 'Upcoming') {
      // Check if user has already applied
      const hasApplied = isLoggedIn && userApplications.some(app => app.programId === program.id);
      
      if (hasApplied) {
        // Do nothing - button is disabled
        return;
      }
      
      if (!isLoggedIn) {
        // Show login modal for non-authenticated users
        window.dispatchEvent(new CustomEvent('showLoginModal'));
      } else {
        router.push(`/apply?program=${program.id}`);
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
        return `Multiple Dates: ${dates.join(', ')}`;
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
    
    return 'Coming Soon';
  };

  const getApplicationContent = () => {
    if (!program) return {
      title: 'Program Not Found',
      text: 'The program you are looking for could not be found.',
      buttonText: 'Go Back',
      icon: '❓',
      isDisabled: true
    };

    // Check if user has already applied to this program
    const hasApplied = isLoggedIn && userApplications.some(app => app.programId === program.id);

    switch (program.status) {
      case 'Upcoming':
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

  const applicationContent = getApplicationContent();

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Program Details</h1>
          <p className={styles.pageSubtitle}>Discover opportunities to make a difference</p>
        </div>
        
        <div className={styles.pageGrid}>
          {/* Main Content - Program Details */}
          <div className={styles.main}>
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
                
                {/* Host Organization */}
                {(program.organization_name || program.organization_acronym) && (
                  <div className={styles.organizationSection}>
                    <h3 className={styles.orgTitle}>Host Organization</h3>
                    <Link 
                      href={`/programs/org/${program.organization_acronym || program.organization_id}`}
                      className={styles.orgLink}
                    >
                      <div className={styles.orgInfo}>
                        {program.orgLogo && (
                          <Image 
                            src={getOrganizationImageUrl(program.orgLogo)} 
                            alt={`${program.organization_name || program.organization_acronym} logo`}
                            width={48} 
                            height={48}
                            className={styles.orgLogo}
                            onError={(e) => {
                              e.target.src = '/assets/icons/placeholder.svg';
                            }}
                          />
                        )}
                        <div className={styles.orgDetails}>
                          <div className={styles.orgName}>{program.organization_name || program.organization_acronym}</div>
                          {program.organization_acronym && program.organization_name && (
                            <div className={styles.orgId}>{program.organization_acronym}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                )}
                
                {/* Collaboration Display */}
                {(program.is_collaborative === 1 || program.is_collaborative === true) && program.collaborators && program.collaborators.length > 0 && (
                  <CollaborationDisplay 
                    collaborators={program.collaborators}
                    programTitle={program.title}
                  />
                )}
                
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
              </div>
            </div>
          </div>

          {/* Sidebar - Application Invitation and Other Programs */}
          <div className={styles.sidebar}>
            {/* Application Invitation */}
            <div className={`${styles.applicationPanel} ${styles.stickyCard}`}>
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
                  className={`${styles.applyButton} ${
                    applicationContent.isDisabled 
                      ? applicationContent.buttonText === 'Already Applied' 
                        ? styles.applyButtonAlreadyApplied 
                        : styles.applyButtonDisabled 
                      : ''
                  }`}
                  disabled={applicationContent.isDisabled}
                >
                  {applicationContent.buttonText}
                </button>
              </div>
            </div>

            {/* Other Programs from Same Organization */}
            {otherPrograms.length > 0 && (
              <OtherProgramsCarousel 
                programs={otherPrograms}
                organizationName={program.organization_name}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}