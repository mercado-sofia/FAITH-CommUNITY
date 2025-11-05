'use client';

import { useState } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
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

  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'title', label: 'Title A-Z' }
  ];

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
