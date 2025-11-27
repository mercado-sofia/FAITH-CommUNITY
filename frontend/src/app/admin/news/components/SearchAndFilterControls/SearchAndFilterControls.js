'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronDown, FiSearch, FiX, FiArchive } from 'react-icons/fi';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import styles from './SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  searchQuery,
  sortBy,
  statusFilter,
  showCount,
  onSearchChange,
  onSortChange,
  onStatusFilterChange,
  onShowCountChange,
  isArchiveMode = false,
  showArchiveToggle = true
}) => {
  const router = useRouter();
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

  useEffect(() => {
    setLocalQuery(searchQuery || '');
  }, [searchQuery]);

  const showCountOptions = [5, 10, 15, 20];
  const statusOptions = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'scheduled', label: 'Scheduled' }
  ];

  const handleArchiveToggle = () => {
    if (isArchiveMode) {
      router.push('/admin/news');
    } else {
      router.push('/admin/news/archive');
    }
  };

  return (
    <div className={styles.controlsRow}>
      <div className={styles.filtersRow}>
        {/* Show count dropdown */}
        <div className={styles.dropdownWrapper}>
          <span className={styles.inlineLabel}>Show</span>
          <div className={styles.dropdownButtonWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "show" ? styles.open : ""}`}
              onClick={() => toggleDropdown("show")}
            >
              {showCount}
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "show" && (
              <ul className={styles.options}>
                {showCountOptions.map((count) => (
                  <li key={count} onClick={() => {
                    onShowCountChange(count);
                    setShowDropdown(null);
                  }}>
                    {count}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

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

        {/* Status Filter - hidden in archive mode */}
        {!isArchiveMode && (
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.dropdown} ${showDropdown === "status" ? styles.open : ""}`}
              onClick={() => toggleDropdown("status")}
            >
              <span className={styles.statusLabel}>Status:</span>
              <span className={styles.statusValue}>
                {statusOptions.find(opt => opt.value === statusFilter)?.label || 'All'}
              </span>
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "status" && (
              <ul className={styles.options}>
                {statusOptions.map((option) => (
                  <li 
                    key={option.value} 
                    onClick={() => {
                      onStatusFilterChange(option.value);
                      setShowDropdown(null);
                    }}
                  >
                    {option.label}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Sort Button */}
        <button
          className={styles.sortButton}
          onClick={() => {
            const newSort = sortBy === 'newest' ? 'oldest' : 'newest';
            onSortChange(newSort);
          }}
          title={sortBy === 'newest' ? 'Sort: Newest First' : 'Sort: Oldest First'}
        >
          {sortBy === 'newest' ? (
            <BsSortUp className={styles.sortIcon} />
          ) : (
            <BsSortDown className={styles.sortIcon} />
          )}
        </button>
      </div>
      
      {/* Archive Toggle Button - only show if showArchiveToggle is true */}
      {showArchiveToggle && (
        <div className={styles.archiveButtonWrapper}>
          <button
            className={styles.archiveToggleButton}
            onClick={handleArchiveToggle}
            title={isArchiveMode ? 'View Active News' : 'View Archived News'}
          >
            <FiArchive className={styles.archiveIcon} />
            {isArchiveMode ? 'Active News' : 'Archive'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterControls;
