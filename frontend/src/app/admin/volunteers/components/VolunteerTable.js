'use client';

import { useState, useEffect, useRef } from 'react';
import { FaChevronDown, FaSearch } from 'react-icons/fa';
import styles from '../../styles/volunteers.module.css';
import VolunteerDetailModal from './VolunteerDetailModal';
import StatusBadge from './StatusBadge';
import ActionButtons from './ActionButtons';
import ConfirmationModal from './ConfirmationModal';

export default function VolunteerTable() {
  const filterRef = useRef(null);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const [selectedApp, setSelectedApp] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, appId: null, action: null });

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('Newest');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetch volunteers data
  useEffect(() => {
    const fetchVolunteers = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/volunteers');
        if (!response.ok) {
          throw new Error('Failed to fetch volunteers');
        }
        const volunteers = await response.json();
        console.log('Fetched volunteers:', volunteers);
        setData(volunteers);
      } catch (err) {
        console.error('Error fetching volunteers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVolunteers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const selectFilter = (option) => {
    setFilter(option);
    setShowFilterDropdown(false);
  };

  const selectSort = (option) => {
    setSortOrder(option);
    setShowSortDropdown(false);
  };

  const filteredData = data
    .filter(app => {
      const matchesSearch = searchQuery
        ? app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.program.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesFilter = filter === 'All' || app.status === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortOrder === 'Newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortOrder === 'Oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortOrder === 'A-Z') return a.full_name.localeCompare(b.full_name);
      if (sortOrder === 'Z-A') return b.full_name.localeCompare(a.full_name);
      return 0;
    });

  const handleConfirm = async (appId, actionType) => {
    setConfirm({ open: true, appId, action: actionType });
  };

  const proceedAction = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/volunteers/${confirm.appId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: confirm.action }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      // Update local state
      setData(prev =>
        prev.map(app =>
          app.id === confirm.appId ? { ...app, status: confirm.action } : app
        )
      );

      setConfirm({ open: false, appId: null, action: null });
      setSelectedApp(null);
    } catch (err) {
      console.error('Error updating status:', err);
      // You might want to show an error message to the user here
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>Volunteer Applications</h2>
        <p className={styles.subheading}>
          Review and manage submitted volunteer applications from students.
        </p>
      </div>

      <div className={styles.controls}>
        <form onSubmit={handleSearchSubmit} className={styles.searchWrapper}>
          <input
            type="text"
            placeholder="Search by name or program..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={styles.searchBar}
          />
          <button type="submit" className={styles.searchiconButton}>
            <FaSearch />
          </button>
        </form>

        <div className={styles.dropdownWrapper} ref={filterRef}>
          <button
            className={`${styles.dropdownTrigger} ${filter !== 'All' ? styles.activeDropdown : ''}`}
            onClick={() => {
              setShowFilterDropdown(!showFilterDropdown);
              setShowSortDropdown(false);
            }}
          >
            <span>{filter}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showFilterDropdown && (
            <div className={styles.dropdownMenu}>
              {['All', 'Pending', 'Approved', 'Rejected'].map(option => (
                <div key={option} onClick={() => selectFilter(option)}>{option}</div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.dropdownWrapper} ref={sortRef}>
          <button
            className={`${styles.dropdownTrigger} ${sortOrder !== 'Newest' ? styles.activeDropdown : ''}`}
            onClick={() => {
              setShowSortDropdown(!showSortDropdown);
              setShowFilterDropdown(false);
            }}
          >
            <span>{sortOrder}</span>
            <FaChevronDown className={styles.dropdownIcon} />
          </button>
          {showSortDropdown && (
            <div className={styles.dropdownMenu}>
              {['Newest', 'Oldest', 'A-Z', 'Z-A'].map(option => (
                <div key={option} onClick={() => selectSort(option)}>{option}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHead}>Name</th>
            <th className={styles.tableHead}>Program</th>
            <th className={styles.tableHead}>Date</th>
            <th className={styles.tableHead}>Status</th>
            <th className={styles.tableHead}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map(app => (
            <tr key={app.id}>
              <td className={styles.tableCell}>{app.full_name}</td>
              <td className={styles.tableCell}>{app.program}</td>
              <td className={styles.tableCell}>
                {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}
              </td>
              <td className={styles.tableCell}><StatusBadge status={app.status} /></td>
              <td className={styles.tableCell}>
                <button
                  className={`${styles.viewButton} ${styles.view}`}
                  onClick={() => setSelectedApp(app)}
                >
                  View
                </button>
                {app.status === 'Pending' && (
                  <ActionButtons app={app} onTrigger={handleConfirm} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedApp && (
        <VolunteerDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={(id, status) => handleConfirm(id, status)}
        />
      )}

      {confirm.open && (
        <ConfirmationModal
          action={confirm.action}
          onConfirm={proceedAction}
          onCancel={() => setConfirm({ open: false, appId: null, action: null })}
        />
      )}
    </div>
  );
}