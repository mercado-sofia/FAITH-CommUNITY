'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
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
  // Count props
  totalCount = 0,
  filteredCount = 0
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

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' }
  ];

  const collaborationStatusOptions = [
    { value: 'all', label: 'All Collaborations' },
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

        {/* Sort Dropdown */}
        <div className={styles.dropdownWrapper}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("sort")}
          >
            Sort: {sortOptions.find(opt => opt.value === sortBy)?.label || 'Newest'}
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

        {/* Collaboration Status Filter - Only show for collaboration tab */}
        {isCollaborationTab && (
          <div className={styles.dropdownWrapper}>
            <div
              className={styles.dropdown}
              onClick={() => toggleDropdown("collaborationStatus")}
            >
              Status: {collaborationStatusOptions.find(opt => opt.value === collaborationStatusFilter)?.label || 'All Collaborations'}
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

      {/* Results Count on the right */}
      <div className={styles.resultsCount}>
        {filteredCount === totalCount ? (
          <span>{totalCount} program{totalCount !== 1 ? 's' : ''}</span>
        ) : (
          <span>{filteredCount} of {totalCount} programs</span>
        )}
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
