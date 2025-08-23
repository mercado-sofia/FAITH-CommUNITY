'use client';

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { FiEye } from 'react-icons/fi';
import styles from '../dashboard.module.css';
import { useGetRecentPendingApprovalsQuery, useGetOrganizationsForFilterQuery } from '../../../../rtk/superadmin/dashboardApi';
import { CgOptions } from "react-icons/cg";

export default function PendingApprovalsTable() {
  const [filter, setFilter] = useState('All');
  const [selectedOrganization, setSelectedOrganization] = useState('all');
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  const { 
    data: approvals = [], 
    isLoading, 
    error 
  } = useGetRecentPendingApprovalsQuery();

  const {
    data: organizations = [],
    isLoading: orgsLoading,
    error: orgsError
  } = useGetOrganizationsForFilterQuery();

  console.log('Organizations data:', organizations);
  console.log('Organizations loading:', orgsLoading);
  console.log('Organizations length:', organizations?.length);
  console.log('Organizations error:', orgsError);

  const handleFilterChange = (status) => {
    setFilter(status);
    setShowOptions(false);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
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
          <h2 className={styles.sectionTitle}>Pending Approvals</h2>
          <div className={styles.filterControls}>
            <select 
              className={styles.filterSelect}
              disabled
            >
              <option value="all">All Organizations</option>
            </select>
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
          <h2 className={styles.sectionTitle}>Pending Approvals</h2>
          <div className={styles.filterControls}>
            <Link href="/superadmin/approvals" className={styles.viewAllButton}>
              <FiEye />
              View All
            </Link>
          </div>
        </div>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No pending approvals</h3>
          <p>There are currently no pending approvals to review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pendingApprovalsSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Pending Approvals</h2>
        <div className={styles.filterControls}>
          <select 
            value={selectedOrganization} 
            onChange={(e) => setSelectedOrganization(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Organizations</option>
            {organizations.map(org => (
              <option key={org.id} value={org.acronym}>
                {org.acronym} - {org.name}
              </option>
            ))}
          </select>
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
                <span className={`${styles.statusBadge} ${styles.pending}`}>
                  Pending
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
