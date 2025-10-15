'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCollaborationRequests } from '../../../hooks/useCollaborationRequests';
import { CollaborationCard } from './CollaborationCard';
import { CollaborationModal } from './CollaborationModal';
import ViewVolunteersModal from '../ViewVolunteersModal';
import { SuccessModal } from '@/components';
import { getEffectiveStatus } from '@/utils/collaborationStatusUtils';
import styles from './CollaborationsSection.module.css';

export function CollaborationsSection({ onRefresh }) {
  const { 
    collaborations, 
    isLoading, 
    error, 
    acceptCollaboration, 
    declineCollaboration,
    fetchCollaborations
  } = useCollaborationRequests();
  
  const [selectedCollaboration, setSelectedCollaboration] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingVolunteersProgram, setViewingVolunteersProgram] = useState(null);
  const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', type: 'success' });
  
  // Filter and sort states
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Refresh data when component mounts
  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  // Handle collaboration action (accept/decline)
  const handleCollaborationAction = async (collaborationId, action) => {
    console.log(`🔍 Frontend: Handling ${action} for collaboration ID: ${collaborationId}`);
    
    if (!collaborationId) {
      setSuccessModal({
        isVisible: true,
        message: 'Collaboration ID is missing. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    try {
      let result;
      if (action === 'accept') {
        result = await acceptCollaboration(collaborationId);
      } else if (action === 'decline') {
        result = await declineCollaboration(collaborationId);
      }
      
      let message = result?.message || `Collaboration request ${action}ed successfully!`;
      
      // Add specific message for acceptance
      if (action === 'accept') {
        message = 'Collaboration request accepted! The program will now be sent to the superadmin for final approval.';
      } else if (action === 'decline') {
        message = 'Collaboration request declined. The program will be marked as declined and not sent to the superadmin.';
      }
      
      setSuccessModal({
        isVisible: true,
        message: message,
        type: 'success'
      });

      // Refresh collaboration data
      await fetchCollaborations();
      
      // Also refresh programs data if callback provided (to update program statuses)
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      setSuccessModal({
        isVisible: true,
        message: `Failed to ${action} collaboration request: ${error.message}`,
        type: 'error'
      });
    }
  };

  // Helper function to sort by upcoming program dates
  const sortByUpcomingDate = (a, b) => {
    const now = new Date();
    
    // Get the next upcoming date for each collaboration
    const getNextUpcomingDate = (collaboration) => {
      const dates = [];
      
      // Add event_start_date if it exists and is in the future
      if (collaboration.event_start_date) {
        const startDate = new Date(collaboration.event_start_date);
        if (startDate > now) {
          dates.push(startDate);
        }
      }
      
      // Add event_end_date if it exists and is in the future
      if (collaboration.event_end_date) {
        const endDate = new Date(collaboration.event_end_date);
        if (endDate > now) {
          dates.push(endDate);
        }
      }
      
      // Return the earliest upcoming date, or null if no upcoming dates
      return dates.length > 0 ? new Date(Math.min(...dates)) : null;
    };
    
    const aNextDate = getNextUpcomingDate(a);
    const bNextDate = getNextUpcomingDate(b);
    
    // If both have upcoming dates, sort by earliest upcoming date
    if (aNextDate && bNextDate) {
      return aNextDate - bNextDate;
    }
    
    // If only one has upcoming dates, prioritize it
    if (aNextDate && !bNextDate) {
      return -1;
    }
    if (!aNextDate && bNextDate) {
      return 1;
    }
    
    // If neither has upcoming dates, sort by creation date (newest first)
    return new Date(b.invited_at) - new Date(a.invited_at);
  };

  // Filter and sort collaborations
  const filteredAndSortedCollaborations = useCallback(() => {
    let filtered = collaborations.filter((collaboration) => {
      if (!collaboration) {
        return false;
      }
      
      if (!collaboration.program_title) {
        return false;
      }
      
      const matchesSearch = 
        (collaboration.program_title && collaboration.program_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (collaboration.program_description && collaboration.program_description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (collaboration.program_org_name && collaboration.program_org_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (collaboration.inviter_org_name && collaboration.inviter_org_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (collaboration.invitee_org_name && collaboration.invitee_org_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const effectiveStatus = getEffectiveStatus(collaboration.status, collaboration.program_status);
      const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });

    // Sort collaborations
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.invited_at) - new Date(a.invited_at);
        case 'oldest':
          return new Date(a.invited_at) - new Date(b.invited_at);
        case 'upcoming':
          return sortByUpcomingDate(a, b);
        case 'program_title':
          return (a.program_title || '').localeCompare(b.program_title || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [collaborations, searchQuery, statusFilter, sortBy]);

  const handleViewCollaboration = (collaboration) => {
    setSelectedCollaboration(collaboration);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCollaboration(null);
  };

  const closeSuccessModal = () => {
    setSuccessModal({ isVisible: false, message: '', type: 'success' });
  };

  const handleViewVolunteers = (collaboration) => {
    // Convert collaboration data to program format expected by ViewVolunteersModal
    const programData = {
      id: collaboration.program_id,
      title: collaboration.program_title,
      description: collaboration.program_description,
      // Add other necessary fields if needed
    };
    setViewingVolunteersProgram(programData);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading collaborations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} style={{ color: 'red' }}>
          Error loading collaborations: {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h2>Collaboration Requests</h2>
            <p>Manage collaboration requests for your programs</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filtersSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Search collaborations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filters}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Collaborations</option>
            <option value="pending">Pending Response</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="pending_collaboration">Pending Collaboration</option>
            <option value="pending_superadmin_approval">Pending Superadmin Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="upcoming">Nearest Upcoming</option>
            <option value="program_title">Alphabetical</option>
            <option value="status">Program Status</option>
          </select>
        </div>
      </div>

      {/* Collaborations List */}
      <div className={styles.collaborationsSection}>
        {(() => {
          const filteredCollaborations = filteredAndSortedCollaborations();
          
          return (filteredCollaborations?.length || 0) === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No collaborations found</div>
              <div className={styles.emptyText}>
                {statusFilter === 'all' 
                  ? 'No collaboration requests match your current filters. Try adjusting your search criteria.'
                  : `No ${statusFilter} collaboration requests found.`
                }
              </div>
            </div>
          ) : (
            <div className={styles.collaborationsGrid}>
              {filteredCollaborations.map((collaboration) => (
                <CollaborationCard
                  key={collaboration.program_id}
                  collaboration={collaboration}
                  onViewDetails={() => handleViewCollaboration(collaboration)}
                  onEdit={() => {
                    // TODO: Implement edit functionality
                    console.log('Edit collaboration:', collaboration);
                  }}
                  onDelete={() => {
                    // TODO: Implement delete functionality
                    console.log('Delete collaboration:', collaboration);
                  }}
                  onViewVolunteers={() => handleViewVolunteers(collaboration)}
                  onOptOut={() => {
                    // TODO: Implement opt out functionality
                    console.log('Opt out of collaboration:', collaboration);
                  }}
                />
              ))}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {isModalOpen && selectedCollaboration && (
        <CollaborationModal
          collaboration={selectedCollaboration}
          onClose={closeModal}
          onAccept={() => {
            handleCollaborationAction(selectedCollaboration.collaboration_id, 'accept');
            closeModal();
          }}
          onDecline={() => {
            handleCollaborationAction(selectedCollaboration.collaboration_id, 'decline');
            closeModal();
          }}
        />
        )}

      {/* View Volunteers Modal */}
      {viewingVolunteersProgram && (
        <ViewVolunteersModal
          program={viewingVolunteersProgram}
          isOpen={!!viewingVolunteersProgram}
          onClose={() => setViewingVolunteersProgram(null)}
        />
      )}

      <SuccessModal
        message={successModal.message}
        isVisible={successModal.isVisible}
        onClose={closeSuccessModal}
        type={successModal.type}
        autoHideDuration={4000}
      />
    </div>
  );
}
