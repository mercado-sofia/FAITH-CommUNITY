'use client';

import { useState, useEffect } from 'react';
import { FaFileAlt } from 'react-icons/fa';
import { getApiUrl, getAuthHeaders } from '../../utils/api';
import styles from './MyApplications.module.css';

export default function MyApplications() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, approved, rejected

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(getApiUrl('/api/users/applications'), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications || []);
      } else {
        setApplications([]);
      }
    } catch (error) {
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Removed status icons for cleaner look

  const getStatusText = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'pending':
      default:
        return 'Pending Review';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status.toLowerCase() === filter;
  });

  if (isLoading) {
    return (
      <div className={styles.myApplicationsSection}>
        <div className={styles.sectionHeader}>
          <h2>My Applications</h2>
        </div>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.myApplicationsSection}>
      <div className={styles.sectionHeader}>
        <h2>My Applications</h2>
      </div>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
          onClick={() => setFilter('all')}
        >
          All Applications ({applications.length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'pending' ? styles.active : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({applications.filter(app => app.status.toLowerCase() === 'pending').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'approved' ? styles.active : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({applications.filter(app => app.status.toLowerCase() === 'approved').length})
        </button>
        <button
          className={`${styles.filterTab} ${filter === 'rejected' ? styles.active : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({applications.filter(app => app.status.toLowerCase() === 'rejected').length})
        </button>
      </div>

      {/* Applications List */}
      <div className={styles.applicationsList}>
        {filteredApplications.length === 0 ? (
          <div className={styles.emptyState}>
            <FaFileAlt className={styles.emptyIcon} />
            <p>No applications found</p>
            <span>
              {filter === 'all' 
                ? "You haven't applied to any programs yet" 
                : `No ${filter} applications found`
              }
            </span>
          </div>
        ) : (
          <div className={styles.applicationsContainer}>
            {filteredApplications.map((application) => (
              <div key={application.id} className={styles.applicationCard}>
                <div className={styles.applicationHeader}>
                  <div className={styles.applicationTitle}>
                    <h3>{application.programName}</h3>
                    <div className={styles.applicationMeta}>
                      <span className={styles.applicationDate}>
                        Applied on {formatDate(application.appliedAt)}
                      </span>
                      <span className={`${styles.statusBadge} ${styles[`status${application.status.charAt(0).toUpperCase() + application.status.slice(1)}`]}`}>
                        {getStatusText(application.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.applicationDetails}>
                  {application.programStartDate && application.programEndDate && (
                    <div className={styles.programDates}>
                      <span className={styles.dateRange}>
                        {formatDate(application.programStartDate)} - {formatDate(application.programEndDate)}
                      </span>
                    </div>
                  )}
                  
                  {application.organizationName && (
                    <div className={styles.organizationInfo}>
                      <span className={styles.organizationName}>{application.organizationName}</span>
                      {application.organizationAcronym && (
                        <span className={styles.organizationAcronym}>({application.organizationAcronym})</span>
                      )}
                    </div>
                  )}
                </div>

                {application.notes && (
                  <div className={styles.applicationNotes}>
                    <p>{application.notes}</p>
                  </div>
                )}

                {application.feedback && (
                  <div className={styles.applicationFeedback}>
                    <p>{application.feedback}</p>
                  </div>
                )}

                <div className={styles.applicationActions}>
                  <button 
                    className={styles.viewButton}
                    onClick={() => {
                      // TODO: Implement view details functionality
                    }}
                    aria-label={`View details for ${application.programName} application`}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
