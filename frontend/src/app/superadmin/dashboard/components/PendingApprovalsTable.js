'use client';

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { FiEye, FiChevronDown } from 'react-icons/fi';
import styles from './styles/PendingApprovalsTable.module.css';
import { useGetRecentApprovalsQuery, useGetOrganizationsForFilterQuery } from '../../../../rtk/superadmin/dashboardApi';

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

  // Apply organization filter to the already filtered list
  const organizationFilteredList = selectedOrganization === 'all'
    ? filteredList 
    : filteredList.filter(approval => 
        approval.organization_acronym === selectedOrganization ||
        approval.org === selectedOrganization ||
        approval.organization?.acronym === selectedOrganization ||
        approval.organization?.name === selectedOrganization
      );

  const displayList = organizationFilteredList.slice(0, Math.max(5, organizationFilteredList.length));

  // Format date for display - handle string dates from API
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
              <th>Organization</th>
              <th>Section</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((index) => (
              <tr key={index}>
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
            <th>Organization</th>
            <th>Section</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {displayList.map((approval) => (
            <tr key={approval.id}>
              <td>{approval.organization_acronym || 'N/A'}</td>
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
              <td colSpan={4} style={{ textAlign: 'center', padding: '1rem' }}>
                No {filter.toLowerCase()} approvals found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
