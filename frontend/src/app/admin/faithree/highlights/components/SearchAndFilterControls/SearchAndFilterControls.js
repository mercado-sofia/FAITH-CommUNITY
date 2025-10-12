'use client';

import { useState } from 'react';
import { FiSearch, FiFilter, FiRefreshCw } from 'react-icons/fi';
import styles from './SearchAndFilterControls.module.css';

export default function SearchAndFilterControls({
  searchQuery,
  sortBy,
  statusFilter,
  onSearchChange,
  onFilterChange,
  onRefresh,
  totalCount,
  filteredCount,
  isRefreshing = false
}) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' }
  ];

  const getSortLabel = (value) => {
    return sortOptions.find(option => option.value === value)?.label || 'Newest First';
  };

  return (
    <div className={styles.controlsContainer}>
      {/* Status Tabs */}
      <div className={styles.statusTabs}>
        <button
          className={`${styles.statusTab} ${statusFilter === 'pending' ? styles.active : ''}`}
          onClick={() => onFilterChange('status', 'pending')}
        >
          Pending
        </button>
        <button
          className={`${styles.statusTab} ${statusFilter === 'showed-in-public' ? styles.active : ''}`}
          onClick={() => onFilterChange('status', 'showed-in-public')}
        >
          Showed in Public
        </button>
      </div>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <FiSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search highlights..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Filter Controls */}
      <div className={styles.filterContainer}>
        {/* Refresh Button */}
        <button
          className={styles.refreshButton}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh highlights"
        >
          <FiRefreshCw className={`${styles.refreshIcon} ${isRefreshing ? styles.spinning : ''}`} />
        </button>

        {/* Sort Dropdown */}
        <div className={styles.sortDropdown}>
          <button
            className={styles.sortButton}
            onClick={() => setShowSortDropdown(!showSortDropdown)}
          >
            <FiFilter className={styles.filterIcon} />
            <span>{getSortLabel(sortBy)}</span>
            <svg
              className={`${styles.dropdownArrow} ${showSortDropdown ? styles.rotated : ''}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showSortDropdown && (
            <div className={styles.dropdownMenu}>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  className={`${styles.dropdownItem} ${sortBy === option.value ? styles.active : ''}`}
                  onClick={() => {
                    onFilterChange('sort', option.value);
                    setShowSortDropdown(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className={styles.resultsCount}>
          {filteredCount === totalCount ? (
            <span>{totalCount} highlight{totalCount !== 1 ? 's' : ''}</span>
          ) : (
            <span>{filteredCount} of {totalCount} highlights</span>
          )}
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showSortDropdown && (
        <div
          className={styles.dropdownOverlay}
          onClick={() => setShowSortDropdown(false)}
        />
      )}
    </div>
  );
}
