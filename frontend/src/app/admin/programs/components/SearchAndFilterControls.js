'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import styles from './styles/SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  searchQuery,
  statusFilter,
  categoryFilter,
  sortBy,
  showCount,
  onSearchChange,
  onFilterChange,
  totalCount,
  filteredCount
}) => {
  const [showDropdown, setShowDropdown] = useState(null);
  const [localQuery, setLocalQuery] = useState(searchQuery || '');

  const toggleDropdown = (key) => {
    setShowDropdown((prev) => (prev === key ? null : key));
  };

  const handleClickOutside = (e) => {
    if (!e.target.closest(`.${styles.dropdownWrapper}`)) {
      setShowDropdown(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'education', label: 'Education' },
    { value: 'health', label: 'Health' },
    { value: 'environment', label: 'Environment' },
    { value: 'community', label: 'Community Development' },
    { value: 'youth', label: 'Youth Programs' },
    { value: 'women', label: 'Women Empowerment' },
    { value: 'elderly', label: 'Elderly Care' },
    { value: 'disaster', label: 'Disaster Relief' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'all', label: 'All status' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' }
  ];

  const sortOptions = [
    { value: 'latest', label: 'Latest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' }
  ];

  const showOptions = [
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 15, label: '15' },
    { value: 20, label: '20' },
    { value: 50, label: '50' }
  ];

  return (
    <div className={styles.controlsRow}>
      {/* Search, Sort, and Status Filter on the left */}
      <div className={styles.filtersRow}>
        {/* Search input */}
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchChange(localQuery);
              }
            }}
            className={styles.searchInput}
          />
          {localQuery ? (
            <FiX className={styles.clearIcon} onClick={() => {
              setLocalQuery('');
              onSearchChange('');
            }} />
          ) : (
            <FiSearch className={styles.searchIcon} onClick={() => onSearchChange(localQuery)} />
          )}
        </div>

        {/* Sort Dropdown */}
        <div className={styles.dropdownWrapper} style={{ marginLeft: '1rem' }}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("sort")}
          >
            Sort: {sortOptions.find(opt => opt.value === sortBy)?.label || 'Latest First'}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "sort" && (
            <ul className={styles.options}>
              {sortOptions.map((option) => (
                <li key={option.value} onClick={() => {
                  onFilterChange('sort', option.value);
                  setShowDropdown(null);
                }}>
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status Filter */}
        <div className={styles.dropdownWrapper} style={{ marginLeft: '1rem' }}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("status")}
          >
            {statuses.find(status => status.value === statusFilter)?.label || 'All status'}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "status" && (
            <ul className={styles.options}>
              {statuses.map((status) => (
                <li key={status.value} onClick={() => {
                  onFilterChange('status', status.value);
                  setShowDropdown(null);
                }}>
                  {status.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Empty right side */}
      <div className={styles.searchWrapper}>
        {/* Empty - moved search and sort to left */}
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
