'use client';

import Link from 'next/link'
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import { formatDateShort } from '../../../../utils/dateUtils';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';
import styles from './styles/RecentApprovalsTable.module.css';
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
  
  // Regular organization filtering - treat all organizations the same, including "Collab Admin"
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
    }
  }

  return false;
};

export default function PendingApprovalsTable() {
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [showDropdown, setShowDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const { 
    data: approvals = [], 
    isLoading
  } = useGetRecentApprovalsQuery();

  const {
    data: organizations = [],
    isLoading: orgsLoading
  } = useGetOrganizationsForFilterQuery();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Apply organization filter to the approvals list (including collaborators)
  const organizationFilteredList = selectedOrganization === 'all'
    ? approvals 
    : approvals.filter(approval => 
        matchesOrganization(approval, selectedOrganization)
      );

  const displayList = organizationFilteredList.slice(0, Math.max(5, organizationFilteredList.length));

  // Get section display name
  // Note: advocacy and competency are no longer part of the approval workflow
  const getSectionName = (section) => {
    switch (section) {
      case 'organization': return 'Organization';
      case 'programs': return 'Programs';
      case 'news': return 'News';
      case 'org_heads': return 'Org Heads';
      default: return section || 'Unknown';
    }
  };

  // Check if any approval is a program submission to show Title column
  const hasProgramSubmissions = approvals.some(item => 
    item.section && item.section.toLowerCase() === 'programs'
  );

  // Helper function to extract program title from proposed_data
  const getProgramTitle = (item) => {
    if (item.section && item.section.toLowerCase() === 'programs' && item.proposed_data) {
      try {
        const proposedData = typeof item.proposed_data === 'string' 
          ? JSON.parse(item.proposed_data) 
          : item.proposed_data;
        return proposedData?.title || 'N/A';
      } catch (error) {
        return 'N/A';
      }
    }
    return null;
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
            View All
          </Link>
        </div>
        </div>
        <table className={styles.approvalsTable}>
          <thead>
            <tr>
              <th className={styles.numberColumn}>#</th>
              <th>Organization</th>
              {hasProgramSubmissions && (
                <th className={styles.titleColumn}>Title</th>
              )}
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
                {hasProgramSubmissions && (
                  <td>Loading...</td>
                )}
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
            View All
          </Link>
        </div>
      </div>

      <table className={styles.approvalsTable}>
        <thead>
          <tr>
            <th className={styles.numberColumn}>#</th>
            <th>Organization</th>
            {hasProgramSubmissions && (
              <th className={styles.titleColumn}>Title</th>
            )}
            <th>Section</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {displayList.map((approval, index) => {
            const programTitle = getProgramTitle(approval);
            return (
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
              {hasProgramSubmissions && (
                <td className={styles.titleCell}>
                  {programTitle || '-'}
                </td>
              )}
              <td>{getSectionName(approval.section)}</td>
              <td>{formatDateShort(approval.submitted_at)}</td>
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
          );
          })}
          {displayList.length === 0 && (
            <tr>
              <td colSpan={hasProgramSubmissions ? 6 : 5} style={{ textAlign: 'center', padding: '1rem' }}>
                No approvals found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
