'use client';

import Link from 'next/link'
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { FiEye, FiChevronDown } from 'react-icons/fi';
import { formatDateShort } from '../../../../utils/dateUtils';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
import styles from './styles/PendingApprovalsTable.module.css';
import { useGetRecentApprovalsQuery, useGetOrganizationsForFilterQuery } from '../../../../rtk/superadmin/dashboardApi';

// Helper function to normalize organization acronym for comparison (case-insensitive, trim spaces)
const normalizeOrgAcronym = (acronym) => {
  if (!acronym) return '';
  return String(acronym).trim().toLowerCase();
};

// Helper function to check if approval matches selected organization (including collaborators)
const matchesOrganization = (approval, orgAcronym) => {
  if (!orgAcronym || orgAcronym === 'all') return true;
  
  const normalizedOrgAcronym = normalizeOrgAcronym(orgAcronym);
  
  // Special case: "Collab Admin" or "Collaboration Administrator" - filter for collaborative programs
  const isCollabAdmin = normalizedOrgAcronym === 'collab admin' || 
                        normalizedOrgAcronym === 'collaboration administrator' ||
                        normalizedOrgAcronym.includes('collab admin') ||
                        normalizedOrgAcronym.includes('collaboration administrator');
  
  if (isCollabAdmin) {
    // Only filter collaborative programs for program submissions
    if (approval.section === 'programs' && approval.proposed_data) {
      try {
        const proposedData = typeof approval.proposed_data === 'string' 
          ? JSON.parse(approval.proposed_data) 
          : approval.proposed_data;
        
        if (proposedData) {
          // Check if program is collaborative (has is_collaborative flag set to true/1)
          const isCollaborative = proposedData.is_collaborative === true || 
                                  proposedData.is_collaborative === 1 ||
                                  proposedData.is_collaborative === '1';
          
          // Check if program has collaborators array with at least one collaborator
          const hasCollaborators = proposedData.collaborators && 
                                   Array.isArray(proposedData.collaborators) && 
                                   proposedData.collaborators.length > 0;
          
          // Return true if program is collaborative (either by flag or has collaborators)
          return isCollaborative || hasCollaborators;
        }
      } catch (error) {
        // If parsing fails, don't include this approval
        console.warn('Error parsing proposed_data for approval:', approval.id, error);
        return false;
      }
    }
    // For non-program submissions, don't match when Collab Admin is selected
    return false;
  }
  
  // Regular organization filtering
  // Check main organization (case-insensitive)
  const mainOrgAcronym = normalizeOrgAcronym(
    approval.org || 
    approval.organization_acronym || 
    approval.organization?.acronym ||
    ''
  );
  
  if (mainOrgAcronym === normalizedOrgAcronym) {
    return true;
  }

  // For program submissions, check collaborators
  if (approval.section === 'programs' && approval.proposed_data) {
    try {
      const proposedData = typeof approval.proposed_data === 'string' 
        ? JSON.parse(approval.proposed_data) 
        : approval.proposed_data;
      
      if (proposedData) {
        // Check if program has collaborators array
        if (proposedData.collaborators && Array.isArray(proposedData.collaborators) && proposedData.collaborators.length > 0) {
          // Check if any collaborator belongs to the selected organization
          const hasMatchingCollaborator = proposedData.collaborators.some(collaborator => {
            // Handle both ID format and object format
            if (typeof collaborator === 'object' && collaborator !== null) {
              const collaboratorOrgAcronym = normalizeOrgAcronym(
                collaborator.organization_acronym ||
                collaborator.org ||
                collaborator.org_acronym ||
                collaborator.organization?.acronym ||
                collaborator.organization?.org ||
                collaborator.organization?.org_acronym ||
                ''
              );
              
              return collaboratorOrgAcronym === normalizedOrgAcronym;
            }
            return false;
          });
          
          if (hasMatchingCollaborator) {
            return true;
          }
        }
        
        // Also check if program is marked as collaborative (is_collaborative flag)
        // This handles cases where collaboration might be stored differently
        if (proposedData.is_collaborative === true || proposedData.is_collaborative === 1) {
          // If it's collaborative, we should still check if this org is involved
          // But if we can't determine, we'll be conservative and not include it
          // unless we have explicit collaborator data
        }
      }
    } catch (error) {
      // If parsing fails, just check main organization (already done above)
      console.warn('Error parsing proposed_data for approval:', approval.id, error);
    }
  }

  return false;
};

export default function PendingApprovalsTable() {
  const [filter, setFilter] = useState('All');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [showOptions, setShowOptions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const { 
    data: approvals = [], 
    isLoading, 
    error 
  } = useGetRecentApprovalsQuery();

  const {
    data: organizations = [],
    isLoading: orgsLoading,
    error: orgsError
  } = useGetOrganizationsForFilterQuery();


  const handleFilterChange = (status) => {
    setFilter(status);
    setShowOptions(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
        setShowDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredList = filter === 'All' 
    ? approvals 
    : approvals.filter((approval) => {
        if (filter === 'Organization') return approval.section === 'organization';
        if (filter === 'Programs') return approval.section === 'programs';
        if (filter === 'News') return approval.section === 'news';
        return true;
      });

  // Apply organization filter to the already filtered list (including collaborators)
  const organizationFilteredList = selectedOrganization === 'all'
    ? filteredList 
    : filteredList.filter(approval => 
        matchesOrganization(approval, selectedOrganization)
      );

  const displayList = organizationFilteredList.slice(0, Math.max(5, organizationFilteredList.length));

  // Format date for display - using same format as approvals page
  const formatDate = (dateString) => {
    return formatDateShort(dateString);
  };

  // Get section display name
  const getSectionName = (section) => {
    switch (section) {
      case 'organization': return 'Organization';
      case 'programs': return 'Programs';
      case 'news': return 'News';
      case 'advocacy': return 'Advocacy';
      case 'competency': return 'Competency';
      case 'org_heads': return 'Org Heads';
      default: return section || 'Unknown';
    }
  };

  // Show loading state
  if (isLoading || orgsLoading) {
    return (
      <div className={styles.pendingApprovalsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Approvals</h2>
        <div className={styles.filterControls}>
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
            >
              {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : selectedOrganization}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "organization" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedOrganization("all");
                  setShowDropdown(null);
                }}>
                  All Organizations
                </li>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => {
                    setSelectedOrganization(org.acronym);
                    setShowDropdown(null);
                  }}>
                    {org.acronym} - {org.name.length > 30 ? org.name.substring(0, 30) + "..." : org.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/superadmin/approvals" className={styles.viewAllButton}>
            <FiEye />
            View All
          </Link>
        </div>
        </div>
        <table className={styles.approvalsTable}>
          <thead>
            <tr>
              <th className={styles.numberColumn}>#</th>
              <th>Organization</th>
              <th>Section</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((index) => (
              <tr key={index}>
                <td className={styles.numberCell}>{index}</td>
                <td>Loading...</td>
                <td>Loading...</td>
                <td>Loading...</td>
                <td>Loading...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Show empty state if no approvals
  if (!approvals || approvals.length === 0) {
    return (
      <div className={styles.pendingApprovalsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Approvals</h2>
          <div className={styles.filterControls}>
            <Link href="/superadmin/approvals" className={styles.viewAllButton}>
              <FiEye />
              View All
            </Link>
          </div>
        </div>
        <div className={styles.emptyState}>
          <h3>No recent approvals</h3>
          <p>There are currently no recent approvals to display.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pendingApprovalsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent Approvals</h2>
        <div className={styles.filterControls}>
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
              onClick={() => setShowDropdown(showDropdown === "organization" ? null : "organization")}
            >
              {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : selectedOrganization}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "organization" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  setSelectedOrganization("all");
                  setShowDropdown(null);
                }}>
                  All Organizations
                </li>
                {organizations.map(org => (
                  <li key={org.id} onClick={() => {
                    setSelectedOrganization(org.acronym);
                    setShowDropdown(null);
                  }}>
                    {org.acronym} - {org.name.length > 30 ? org.name.substring(0, 30) + "..." : org.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link href="/superadmin/approvals" className={styles.viewAllButton}>
            <FiEye />
            View All
          </Link>
        </div>
      </div>

      <table className={styles.approvalsTable}>
        <thead>
          <tr>
            <th className={styles.numberColumn}>#</th>
            <th>Organization</th>
            <th>Section</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {displayList.map((approval, index) => (
            <tr key={approval.id}>
              <td className={styles.numberCell}>
                {index + 1}
              </td>
              <td>
                <div className={styles.orgInfo}>
                  <div className={styles.orgLogoContainer}>
                    {approval.organization_logo ? (() => {
                      const logoUrl = getOrganizationImageUrl(approval.organization_logo, 'logo');
                      if (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') {
                        return (
                          <Image
                            src={logoUrl}
                            alt={`${approval.organization_acronym || approval.org || 'Organization'} logo`}
                            width={40}
                            height={40}
                            className={styles.orgLogo}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                        );
                      }
                      return null;
                    })() : null}
                    <div 
                      className={styles.orgLogoPlaceholder}
                      style={{ 
                        display: (() => {
                          if (!approval.organization_logo) return 'flex';
                          const logoUrl = getOrganizationImageUrl(approval.organization_logo, 'logo');
                          return (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') ? 'none' : 'flex';
                        })()
                      }}
                    >
                      {(approval.organization_acronym || approval.org || '?').charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <span className={styles.orgAcronym}>
                    {approval.organization_acronym || approval.org || 'N/A'}
                  </span>
                </div>
              </td>
              <td>{getSectionName(approval.section)}</td>
              <td>{formatDate(approval.submitted_at)}</td>
              <td>
                <span className={`${styles.statusBadge} ${
                  approval.status === 'approved' ? styles.approved : 
                  approval.status === 'rejected' ? styles.rejected : 
                  styles.pending
                }`}>
                  {approval.status === 'approved' ? 'Approved' : 
                   approval.status === 'rejected' ? 'Rejected' : 
                   'Pending'}
                </span>
              </td>
            </tr>
          ))}
          {displayList.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '1rem' }}>
                No {filter.toLowerCase()} approvals found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
