'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './programDetails.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export default function ProgramDetailsPage() {
  const { programID } = useParams();
  const router = useRouter();
  const [program, setProgram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgram = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/programs`);
        const data = await response.json();
        
        if (data.success) {
          const foundProgram = data.data.find(p => p.id === Number(programID));
          if (foundProgram) {
            setProgram(foundProgram);
          } else {
            setError('Program not found');
          }
        } else {
          setError('Failed to fetch programs');
        }
      } catch (err) {
        console.error('Error fetching program:', err);
        setError('Failed to load program data');
      } finally {
        setLoading(false);
      }
    };

    if (programID) {
      fetchProgram();
    }
  }, [programID]);

  const handleApplyClick = () => {
    if (program.status === 'Upcoming') {
      router.push(`/apply?program=${programID}`);
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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingText}>Loading program details...</div>
        </div>
      </div>
    );
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
                src={program.image} 
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
                {program.date && (
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Date</span>
                    <span className={styles.metaValue}>
                      {new Date(program.date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={styles.programDescription}>
                <h3 className={styles.descriptionTitle}>About This Program</h3>
                <p className={styles.descriptionText}>{program.description}</p>
              </div>
              
              {(program.orgName || program.orgID) && (
                <div className={styles.organizationSection}>
                  <h3 className={styles.orgTitle}>Host Organization</h3>
                  <div className={styles.orgInfo}>
                    {program.icon && (
                      <Image 
                        src={program.icon} 
                        alt={`${program.orgName || program.orgID} logo`}
                        width={48} 
                        height={48}
                        className={styles.orgLogo}
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