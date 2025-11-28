'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import styles from './SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  searchQuery,
  sortBy,
  onSearchChange,
  onFilterChange,
  // Collaboration-specific props
  isCollaborationTab = false,
  collaborationStatusFilter = 'all',
  onCollaborationStatusChange,
  // Archive button
  archiveButton
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


  const collaborationStatusOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending Response' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'declined', label: 'Declined' }
  ];

  return (
    <div className={styles.controlsRow}>
      {/* Search and Sort on the left */}
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

        {/* Sort Button */}
        <button
          className={styles.sortButton}
          onClick={() => {
            const newSort = sortBy === 'newest' ? 'oldest' : 'newest';
            onFilterChange('sort', newSort);
          }}
          title={sortBy === 'newest' ? 'Sort: Newest First' : 'Sort: Oldest First'}
        >
          {sortBy === 'newest' ? (
            <BsSortUp className={styles.sortIcon} />
          ) : (
            <BsSortDown className={styles.sortIcon} />
          )}
        </button>

        {/* Collaboration Status Filter - Only show for collaboration tab */}
        {isCollaborationTab && (
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "collaborationStatus" ? styles.open : ""}`}
              onClick={() => toggleDropdown("collaborationStatus")}
            >
              <span className={styles.statusLabel}>Status:</span>
              <span className={styles.statusValue}>
                {collaborationStatusOptions.find(opt => opt.value === collaborationStatusFilter)?.label || 'All'}
              </span>
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "collaborationStatus" && (
              <ul className={styles.options}>
                {collaborationStatusOptions.map((option) => (
                  <li key={option.value} onClick={() => {
                    onCollaborationStatusChange(option.value);
                    setShowDropdown(null);
                  }}>
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Archive Button on the right */}
      {archiveButton && (
        <div className={styles.archiveButtonWrapper}>
          {archiveButton}
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterControls;
