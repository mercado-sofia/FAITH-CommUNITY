'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './programDetails.module.css';
import Loader from '../../../../components/Loader';
import { getProgramImageUrl } from '../../../../utils/uploadPaths';
import OtherProgramsCarousel from '../components/OtherProgramsCarousel/OtherProgramsCarousel';
import { usePublicPageLoader } from '../../hooks/usePublicPageLoader';

export default function ProgramDetailsPage() {
  const { slug } = useParams();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [program, setProgram] = useState(null);
  const [otherPrograms, setOtherPrograms] = useState([]);
  const [error, setError] = useState(null);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`program-${slug}`);

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

  // Fetch program data by slug or ID
  useEffect(() => {
    const fetchProgramData = async () => {
      try {
        
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
          const otherResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/programs/org/${programData.organization_id}/other/${programData.id}`);
          if (otherResponse.ok) {
            const otherResult = await otherResponse.json();
            setOtherPrograms(otherResult.data);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
      }
    };

    if (slug) {
      fetchProgramData();
    }
  }, [slug]);


  const handleApplyClick = () => {
    if (program && program.status === 'Upcoming') {
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
    if (!program) return {
      title: 'Program Not Found',
      text: 'The program you are looking for could not be found.',
      buttonText: 'Go Back',
      icon: '❓',
      isDisabled: true
    };

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

  if (pageLoading || !pageReady) {
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
                
                {(program.organization_name || program.organization_acronym) && (
                  <div className={styles.organizationSection}>
                    <h3 className={styles.orgTitle}>Host Organization</h3>
                    <Link 
                      href={`/programs/org/${program.organization_acronym || program.organization_id}`}
                      className={styles.orgLink}
                    >
                      <div className={styles.orgInfo}>
                        {program.organization_logo && (
                          <Image 
                            src={program.organization_logo ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${program.organization_logo}` : '/logo/faith_community_logo.png'} 
                            alt={`${program.organization_name || program.organization_acronym} logo`}
                            width={48} 
                            height={48}
                            className={styles.orgLogo}
                            onError={(e) => {
                              e.target.src = '/logo/faith_community_logo.png';
                            }}
                          />
                        )}
                        <div className={styles.orgDetails}>
                          <div className={styles.orgName}>{program.orgName || program.orgID || program.organization_name || program.organization_acronym}</div>
                          {(program.orgID || program.organization_acronym) && (program.orgName || program.organization_name) && (
                            <div className={styles.orgId}>{program.orgID || program.organization_acronym}</div>
                          )}
                        </div>
                      </div>
                    </Link>
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
                  className={`${styles.applyButton} ${applicationContent.isDisabled ? styles.applyButtonDisabled : ''}`}
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
                organizationName={program.organization_name || program.organization_acronym}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}