'use client';

import { useState, useEffect } from 'react';
import { FiSearch, FiChevronDown, FiX } from 'react-icons/fi';
import { BsSortUp, BsSortDown } from 'react-icons/bs';
import styles from './SearchAndFilterControls.module.css';

export default function SearchAndFilterControls({
  searchQuery,
  sortBy,
  programFilter = 'All',
  onSearchChange,
  onFilterChange,
  programs = [],
  programsLoading = false,
  archiveButton
}) {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showDropdown, setShowDropdown] = useState(null);

  const toggleDropdown = (type) => {
    setShowDropdown(showDropdown === type ? null : type);
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

  return (
    <div className={styles.controlsContainer}>
      {/* Top row: Search, Program Filter, Sort, and Archive Button */}
      <div className={styles.controlsRow}>
        {/* Search, Program Filter, and Sort in one row */}
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

          {/* Program filter */}
          <div className={styles.dropdownWrapper}>
            <div
              className={`${styles.programDropdown} ${showDropdown === "program" ? styles.open : ""}`}
              onClick={() => toggleDropdown("program")}
            >
              <span className={styles.programLabel}>Program:</span>
              <span className={styles.programValue}>
                {programsLoading ? "Loading..." : programFilter}
              </span>
              <FiChevronDown className={styles.icon} />
            </div>
            {showDropdown === "program" && (
              <ul className={styles.options}>
                <li key="all" onClick={() => {
                  onFilterChange('program', 'All');
                  setShowDropdown(null);
                }}>
                  All
                </li>
                {programsLoading ? (
                  <li style={{ color: '#666', fontStyle: 'italic' }}>Loading programs...</li>
                ) : programs.length === 0 ? (
                  <li style={{ color: '#666', fontStyle: 'italic' }}>No programs found</li>
                ) : (
                  programs.map((program) => (
                    <li key={program.id} onClick={() => {
                      onFilterChange('program', program.title);
                      setShowDropdown(null);
                    }}>
                      {program.title}
                    </li>
                  ))
                )}
              </ul>
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

        {/* Archive Button on the right */}
        {archiveButton && (
          <div className={styles.archiveButtonWrapper}>
            {archiveButton}
          </div>
        )}
      </div>
    </div>
  );
}
