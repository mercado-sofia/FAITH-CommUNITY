'use client';

import React from 'react';
import { FiTrash2, FiUsers, FiX } from 'react-icons/fi';
import styles from '../ProgramForm.module.css';

const CollaboratorSection = ({
  isEditMode,
  collaboratorInput,
  filteredAdmins,
  selectedAdminIndex,
  selectedAdminForInvite,
  collaborators,
  onCollaboratorInputChange,
  onCollaboratorInputKeyDown,
  onSelectAdmin,
  onClearCollaboratorInput,
  onInviteCollaborator,
  onRemoveCollaborator
}) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <FiUsers className={styles.labelIcon} />
        Add Collaborators
      </label>
      <div className={styles.collaborationSection}>
        <div className={styles.inviteContainer}>
          <div className={styles.inviteInputContainer}>
            <input
              type="text"
              placeholder="Enter admin email or organization"
              className={styles.inviteInput}
              value={collaboratorInput}
              onChange={onCollaboratorInputChange}
              onKeyDown={onCollaboratorInputKeyDown}
            />
            {selectedAdminForInvite && (
              <button
                type="button"
                onClick={onClearCollaboratorInput}
                className={styles.clearButton}
              >
                <FiX />
              </button>
            )}
            {collaboratorInput && !selectedAdminForInvite && (
              <div className={styles.autocompleteDropdown}>
                {filteredAdmins.map((admin, index) => (
                  <div
                    key={admin.id}
                    className={`${styles.autocompleteItem} ${selectedAdminIndex === index ? styles.selected : ''}`}
                    onClick={() => onSelectAdmin(admin)}
                  >
                    <div className={styles.adminInfo}>
                      <span className={styles.adminEmail}>{admin.email || 'No email'}</span>
                      <span className={styles.adminOrg}>({admin.organization_acronym || 'Unknown Org'})</span>
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
            onClick={onInviteCollaborator}
            className={styles.inviteButton}
            disabled={!selectedAdminForInvite}
          >
            Add Collaborator
          </button>
        </div>

        {Array.isArray(collaborators) && collaborators.length > 0 && (
          <div className={styles.selectedCollaborators}>
            <h5>Selected Collaborators ({collaborators.length})</h5>
            <div className={styles.collaboratorsList}>
              {collaborators.map((collaborator, index) => {
                const status = collaborator.status || 'pending';
                const getStatusLabel = () => {
                  switch (status) {
                    case 'accepted':
                      return 'Accepted';
                    case 'declined':
                      return 'Declined';
                    case 'pending':
                    default:
                      return 'Pending Invite';
                  }
                };
                const getStatusClass = () => {
                  switch (status) {
                    case 'accepted':
                      return styles.statusAccepted;
                    case 'declined':
                      return styles.statusDeclined;
                    case 'pending':
                    default:
                      return styles.statusPending;
                  }
                };
                return (
                  <div key={collaborator.id || index} className={styles.collaboratorItem}>
                    <div className={styles.collaboratorInfo}>
                      <span className={styles.collaboratorEmail}>{collaborator.email || 'No email'}</span>
                      <span className={styles.collaboratorOrg}>({collaborator.organization_acronym || 'Unknown Org'})</span>
                      {isEditMode && (
                        <span className={`${styles.statusBadge} ${getStatusClass()}`}>
                          {getStatusLabel()}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCollaborator(index)}
                      className={styles.removeCollaboratorButton}
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorSection;
