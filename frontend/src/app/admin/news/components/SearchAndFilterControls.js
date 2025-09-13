'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX, FiTrash2 } from 'react-icons/fi';
import styles from './styles/SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  searchQuery,
  sortBy,
  showCount,
  onSearchChange,
  onSortChange,
  onShowCountChange,
  totalCount,
  filteredCount,
  onRecentlyDeletedClick
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

  useEffect(() => {
    setLocalQuery(searchQuery || '');
  }, [searchQuery]);

  const sortOptions = ['Newest', 'Oldest'];
  const showCountOptions = [5, 10, 15, 20];

  return (
    <div className={styles.controlsRow}>
      <div className={styles.filtersRow}>
        {/* Show count dropdown */}
        <div className={styles.dropdownWrapper}>
          <span className={styles.inlineLabel}>Show</span>
          <div className={styles.dropdownButtonWrapper}>
            <div
              className={styles.dropdown}
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

        {/* Sort Dropdown */}
        <div className={styles.dropdownWrapper}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("sort")}
          >
            Sort: {sortBy}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "sort" && (
            <ul className={styles.options}>
              {sortOptions.map((option) => (
                <li key={option} onClick={() => {
                  onSortChange(option.toLowerCase());
                  setShowDropdown(null);
                }}>
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recently Deleted Button */}
      {onRecentlyDeletedClick && (
        <div className={styles.recentlyDeletedWrapper}>
          <button
            className={styles.recentlyDeletedButton}
            onClick={onRecentlyDeletedClick}
            title="View recently deleted news items"
          >
            <FiTrash2 size={16} />
            Recently Deleted
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchAndFilterControls;
