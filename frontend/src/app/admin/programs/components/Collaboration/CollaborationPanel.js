'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaUsers, FaUserPlus, FaTrash, FaEye, FaCrown } from 'react-icons/fa';
import styles from './CollaborationPanel.module.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const CollaborationPanel = ({ 
  program, 
  isCreator, 
  onCollaborationUpdate 
}) => {
  const [collaborators, setCollaborators] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [collaboratorInput, setCollaboratorInput] = useState('');
  const [availableAdmins, setAvailableAdmins] = useState([]);
  const [filteredAdmins, setFilteredAdmins] = useState([]);
  const [selectedAdminIndex, setSelectedAdminIndex] = useState(-1);
  const [selectedAdminForInvite, setSelectedAdminForInvite] = useState(null);

  const fetchCollaborators = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${program.id}/collaborators`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const result = await response.json();
      setCollaborators(result.data || []);
    } catch (error) {
      console.error('Error fetching collaborators:', error);
      setError('Failed to load collaborators');
    } finally {
      setIsLoading(false);
    }
  }, [program?.id]);

  const fetchAvailableAdmins = useCallback(async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${program.id}/available-admins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAvailableAdmins(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching available admins:', error);
    }
  }, [program?.id]);

  // Fetch collaborators when component mounts or program changes
  useEffect(() => {
    if (program?.id) {
      fetchCollaborators();
      fetchAvailableAdmins();
    }
  }, [program?.id, fetchCollaborators, fetchAvailableAdmins]);

  const handleCollaboratorInputChange = (e) => {
    const value = e.target.value;
    setCollaboratorInput(value);
    setSelectedAdminIndex(-1);
    setSelectedAdminForInvite(null);

    if (value.trim()) {
      const filtered = availableAdmins.filter(admin => 
        admin.email.toLowerCase().includes(value.toLowerCase()) ||
        admin.organization_acronym.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredAdmins(filtered);
    } else {
      setFilteredAdmins([]);
    }
  };

  const handleCollaboratorInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedAdminIndex(prev => 
        prev < filteredAdmins.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedAdminIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedAdminIndex >= 0 && filteredAdmins[selectedAdminIndex]) {
        selectAdmin(filteredAdmins[selectedAdminIndex]);
      }
    } else if (e.key === 'Escape') {
      setCollaboratorInput('');
      setFilteredAdmins([]);
      setSelectedAdminIndex(-1);
      setSelectedAdminForInvite(null);
    }
  };

  const selectAdmin = (admin) => {
    setSelectedAdminForInvite(admin);
    setCollaboratorInput(`${admin.email} (${admin.organization_acronym})`);
    setFilteredAdmins([]);
    setSelectedAdminIndex(-1);
  };

  const handleInviteCollaborator = async () => {
    if (selectedAdminForInvite) {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${program.id}/invite-collaborator`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            collaboratorAdminId: selectedAdminForInvite.id
          })
        });

        if (response.ok) {
          // Refresh collaborators list
          fetchCollaborators();
          setCollaboratorInput('');
          setSelectedAdminForInvite(null);
          setFilteredAdmins([]);
          if (onCollaborationUpdate) {
            onCollaborationUpdate();
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to add collaborator');
        }
      } catch (error) {
        console.error('Error adding collaborator:', error);
        setError('Failed to add collaborator');
      }
    }
  };

  const handleRemoveCollaborator = async (adminId) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${program.id}/collaborators/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to remove collaborator');
      }

      // Refresh collaborators list
      fetchCollaborators();
      onCollaborationUpdate?.();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      setError('Failed to remove collaborator');
    }
  };

  const handleOptOutCollaboration = async (collaborationId) => {
    if (!confirm('Are you sure you want to opt out of this collaboration? You will no longer have access to this program.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/opt-out`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to opt out of collaboration');
      }

      // Refresh collaborators list
      fetchCollaborators();
      onCollaborationUpdate?.();
    } catch (error) {
      console.error('Error opting out of collaboration:', error);
      setError('Failed to opt out of collaboration');
    }
  };


  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <span className={styles.statusAccepted}>Accepted</span>;
      case 'pending':
        return <span className={styles.statusPending}>Pending</span>;
      case 'declined':
        return <span className={styles.statusDeclined}>Declined</span>;
      default:
        return <span className={styles.statusUnknown}>Unknown</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!program) return null;

  return (
    <div className={styles.collaborationPanel}>
      {isCreator && (
        <div className={styles.inviteContainer}>
          <div className={styles.inviteInputContainer}>
            <input
              type="text"
              placeholder="Enter admin email or organization acronym"
              className={styles.inviteInput}
              value={collaboratorInput}
              onChange={handleCollaboratorInputChange}
              onKeyDown={handleCollaboratorInputKeyDown}
            />
            {collaboratorInput && (
              <div className={styles.autocompleteDropdown}>
                {filteredAdmins.map((admin, index) => (
                  <div
                    key={admin.id}
                    className={`${styles.autocompleteItem} ${selectedAdminIndex === index ? styles.selected : ''}`}
                    onClick={() => selectAdmin(admin)}
                  >
                    <div className={styles.adminInfo}>
                      <span className={styles.adminEmail}>{admin.email}</span>
                      <span className={styles.adminOrg}>({admin.organization_acronym})</span>
                    </div>
                  </div>
                ))}
                {filteredAdmins.length === 0 && collaboratorInput && (
                  <div className={styles.noResults}>No matching admins found</div>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleInviteCollaborator}
            className={styles.inviteButton}
            disabled={!selectedAdminForInvite}
          >
            Add Collaborator
          </button>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <div className={styles.panelContent}>
        {isCreator ? (
          <div className={styles.creatorInfo}>
            <div className={styles.creatorBadge}>
              <FaCrown className={styles.crownIcon} />
              You are the creator
            </div>
            <p className={styles.creatorDescription}>
              You have full control over this program and can invite collaborators.
            </p>
          </div>
        ) : (
          <div className={styles.collaboratorInfo}>
            <div className={styles.collaboratorBadge}>
              <FaEye className={styles.eyeIcon} />
              You are a collaborator
            </div>
            <p className={styles.collaboratorDescription}>
              You can view this program but cannot edit it.
            </p>
          </div>
        )}

        {program.is_collaborative && (
          <div className={styles.collaboratorsSection}>
            <h4 className={styles.sectionTitle}>
              Collaborators ({collaborators.length})
            </h4>

            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Loading collaborators...</p>
              </div>
            ) : collaborators.length === 0 ? (
              <div className={styles.noCollaborators}>
                <p>No collaborators yet.</p>
              </div>
            ) : (
              <div className={styles.collaboratorsList}>
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id || collaborator.admin_id} className={styles.collaboratorItem}>
                    <div className={styles.collaboratorInfo}>
                      <div className={styles.collaboratorEmail}>
                        {collaborator.email}
                      </div>
                      <div className={styles.collaboratorOrg}>
                        {collaborator.organization_name}
                      </div>
                      <div className={styles.collaboratorDates}>
                        Invited: {formatDate(collaborator.invited_at)}
                        {collaborator.responded_at && (
                          <span> • Responded: {formatDate(collaborator.responded_at)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.collaboratorActions}>
                      {getStatusBadge(collaborator.status)}
                      
                      {isCreator && collaborator.status === 'accepted' && (
                        <button
                          onClick={() => handleRemoveCollaborator(collaborator.admin_id || collaborator.id)}
                          className={styles.removeButton}
                          title="Remove collaborator"
                        >
                          <FaTrash />
                        </button>
                      )}
                      
                      {!isCreator && collaborator.status === 'accepted' && (
                        <button
                          onClick={() => handleOptOutCollaboration(collaborator.id)}
                          className={styles.optOutButton}
                          title="Opt out of collaboration"
                        >
                          Opt Out
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default CollaborationPanel;
