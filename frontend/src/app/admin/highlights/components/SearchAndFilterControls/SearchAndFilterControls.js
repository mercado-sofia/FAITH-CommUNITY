'use client';

import { useState } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import styles from './SearchAndFilterControls.module.css';

export default function SearchAndFilterControls({
  searchQuery,
  sortBy,
  onSearchChange,
  onFilterChange,
  totalCount,
  filteredCount,
  isRefreshing = false
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showDropdown, setShowDropdown] = useState(null);

  const toggleDropdown = (type) => {
    setShowDropdown(showDropdown === type ? null : type);
  };

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
            // Toggle between newest and oldest, default to newest if current is title
            const currentSort = sortBy === 'newest' || sortBy === 'oldest' ? sortBy : 'newest';
            const newSort = currentSort === 'newest' ? 'oldest' : 'newest';
            onFilterChange('sort', newSort);
          }}
          title={sortBy === 'newest' ? 'Sort: Newest First' : sortBy === 'oldest' ? 'Sort: Oldest First' : 'Sort: Newest First'}
        >
          {sortBy === 'newest' ? (
            <BsSortUp className={styles.sortIcon} />
          ) : (
            <BsSortDown className={styles.sortIcon} />
          )}
        </button>
      </div>

      {/* Results Count on the right */}
      <div className={styles.resultsCount}>
        {filteredCount === totalCount ? (
          <span>{totalCount} highlight{totalCount !== 1 ? 's' : ''}</span>
        ) : (
          <span>{filteredCount} of {totalCount} highlights</span>
        )}
      </div>
    </div>
  );
}
