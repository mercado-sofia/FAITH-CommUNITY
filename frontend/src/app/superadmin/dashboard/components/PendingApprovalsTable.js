'use client';

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { FiEye } from 'react-icons/fi';
import { CgOptions } from "react-icons/cg";
import styles from './styles/RecentTables.module.css';
import { useGetRecentPendingApprovalsQuery } from '../../../../rtk/superadmin/dashboardApi';

export default function PendingApprovalsTable() {
  const [filter, setFilter] = useState('All');
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  const { 
    data: approvals = [], 
    isLoading, 
    error 
  } = useGetRecentPendingApprovalsQuery();

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

  const displayList = filteredList.slice(0, 5);

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
  if (isLoading) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Approvals</h2>
            <div className={styles.buttonGroup}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  className={styles.iconButton}
                  disabled
                >
                  <CgOptions className={styles.icon} />
                  Filter
                </button>
              </div>
              <Link href="/superadmin/approvals" className={styles.iconButton}>
                <FiEye className={styles.icon} />
                View All
              </Link>
            </div>
          </div>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: '160px' }} />
              <col style={{ width: '200px' }} />
              <col style={{ width: '135px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
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
                  <td>
                    <div className={styles.skeletonText} style={{ width: '80%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonText} style={{ width: '90%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonText} style={{ width: '70%' }}></div>
                  </td>
                  <td>
                    <div className={styles.skeletonBadge}></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show empty state if no approvals
  if (!approvals || approvals.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Approvals</h2>
            <div className={styles.buttonGroup}>
              <div className={styles.dropdownWrapper} ref={dropdownRef}>
                <button
                  className={styles.iconButton}
                  disabled
                >
                  <CgOptions className={styles.icon} />
                  Filter
                </button>
              </div>
              <Link href="/superadmin/approvals" className={styles.iconButton}>
                <FiEye className={styles.icon} />
                View All
              </Link>
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: '13px', color: '#666', fontFamily: 'var(--font-inter)' }}>
            <p>No pending approvals found.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pending Approvals</h2>
          <div className={styles.buttonGroup}>
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.iconButton}
                onClick={() => setShowOptions((prev) => !prev)}
              >
                <CgOptions className={styles.icon} />
                Filter
              </button>
              {showOptions && (
                <ul className={styles.dropdownMenu}>
                  {['All', 'Organization', 'Programs', 'News'].map((status) => (
                    <li
                      key={status}
                      className={`${styles.dropdownItem} ${
                        filter === status ? styles.active : ''
                      }`}
                      onClick={() => handleFilterChange(status)}
                    >
                      {status}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Link href="/superadmin/approvals" className={styles.iconButton}>
              <FiEye className={styles.icon} />
              View All
            </Link>
          </div>
        </div>

        <table className={styles.table}>
          <colgroup>
            <col style={{ width: '160px' }} />
            <col style={{ width: '200px' }} />
            <col style={{ width: '135px' }} />
            <col style={{ width: '100px' }} />
          </colgroup>
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
                <td className={styles.truncate}>{approval.organization_acronym || 'N/A'}</td>
                <td className={styles.truncate}>{getSectionName(approval.section)}</td>
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
    </div>
  );
}
