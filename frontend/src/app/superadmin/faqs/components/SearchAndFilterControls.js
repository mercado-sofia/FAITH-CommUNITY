'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX, FiPlus } from 'react-icons/fi';
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
  onAddNew,
  isCreating
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

  const sortOptions = ['newest', 'oldest'];
  const showCountOptions = [10, 25, 50, 100];

  return (
    <div className={styles.controlsSection}>
      <div className={styles.controlsLeft}>
        <span className={styles.inlineLabel}>Show</span>
        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "show" ? styles.open : ""}`}
            onClick={() => setShowDropdown(showDropdown === "show" ? null : "show")}
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
            <FiSearch className={styles.searchIcon} />
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "sort" ? styles.open : ""}`}
            onClick={() => setShowDropdown(showDropdown === "sort" ? null : "sort")}
          >
            Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "sort" && (
            <ul className={styles.options}>
              {sortOptions.map((option) => (
                <li key={option} onClick={() => {
                  onSortChange(option);
                  setShowDropdown(null);
                }}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.controlsRight}>
        <button
          onClick={onAddNew}
          className={styles.addButton}
          disabled={isCreating}
        >
          <FiPlus /> Add New
        </button>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
