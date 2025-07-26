'use client';

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react';
import { recentApplications } from '../data/mockData';
import { FiFilter, FiEye } from 'react-icons/fi';
import { IoFilter } from "react-icons/io5";
import styles from './styles/RecentTables.module.css';

export default function RecentApplicationsTable() {
  const [filter, setFilter] = useState('All');
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

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

  const filteredList =
    filter === 'All'
      ? recentApplications
      : recentApplications.filter((app) => app.status === filter);

  const sortedList = [...filteredList].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const displayList = sortedList.slice(0, 5);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableWrapper}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Applications</h2>
          <div className={styles.buttonGroup}>
            <div className={styles.dropdownWrapper} ref={dropdownRef}>
              <button
                className={styles.iconButton}
                onClick={() => setShowOptions((prev) => !prev)}
              >
                <IoFilter className={styles.icon} />
                Filter
              </button>
              {showOptions && (
                <ul className={styles.dropdownMenu}>
                  {['All', 'Pending', 'Approved', 'Declined'].map((status) => (
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

            <Link href="/admin/volunteers" className={styles.iconButton}>
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
              <th>Name</th>
              <th>Program</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((app, index) => (
              <tr key={index}>
                <td className={styles.truncate}>{app.name}</td>
                <td className={styles.truncate}>{app.program}</td>
                <td>{app.date}</td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${
                      app.status === 'Pending'
                        ? styles.pending
                        : app.status === 'Approved'
                        ? styles.approved
                        : styles.declined
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
              </tr>
            ))}
            {displayList.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>
                  No {filter.toLowerCase()} applications found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}