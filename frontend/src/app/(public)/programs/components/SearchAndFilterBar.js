"use client";

import styles from '../programs.module.css';
import { FiSearch, FiX } from 'react-icons/fi';
import { FaChevronDown } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';

export default function SearchAndFilterBar({
  onSearch,
  onSortChange,
  onFilterChange,
  initialSearchTerm = '',
  initialFilter = 'All',
  initialSort = 'Newest',
}) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [sort, setSort] = useState(initialSort);
  const [filter, setFilter] = useState(initialFilter);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filterRef = useRef(null);
  const sortRef = useRef(null);

  const handleSearch = () => {
    onSearch?.(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch?.('');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update sort & filter state when props change (e.g. on initial page load)
  useEffect(() => {
    setSort(initialSort);
    setFilter(initialFilter);
    setSearchTerm(initialSearchTerm);
  }, [initialSort, initialFilter, initialSearchTerm]);

  return (
    <div className={styles.searchContainer}>
      {/* Search bar with filter and input */}
      <div className={styles.searchBar}>
        <div className={styles.customSelectWrapper} ref={filterRef}>
          <div
            className={styles.customSelectHeader}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {filter === 'All' ? 'All Category' : filter}
            <FaChevronDown className={styles.dropdownIcon} />
          </div>

          {dropdownOpen && (
            <div className={styles.customSelectOptions}>
              {['All', 'Upcoming', 'Active', 'Completed'].map((option) => (
                <div
                  key={option}
                  className={styles.optionItem}
                  onClick={() => {
                    setFilter(option);
                    onFilterChange?.(option);
                    setDropdownOpen(false);
                  }}
                >
                  {option === 'All' ? 'All Category' : option}
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="text"
          className={styles.searchInput}
          id="searchInput"
          name="search"
          placeholder="Find Projects"
          autoComplete="off"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
        />

        <button
          className={styles.searchBtn}
          onClick={searchTerm.trim() !== '' ? handleClear : handleSearch}
          aria-label={searchTerm.trim() !== '' ? 'Clear Search' : 'Search'}
        >
          {searchTerm.trim() !== '' ? <FiX /> : <FiSearch />}
        </button>
      </div>

      {/* Sort dropdown */}
      <div className={styles.sortSelectWrapper} ref={sortRef}>
        <div
          className={styles.sortSelectHeader}
          onClick={() => setSortOpen(!sortOpen)}
        >
          {sort}
          <FaChevronDown className={styles.sortdropdownIcon} />
        </div>

        {sortOpen && (
          <div className={styles.sortSelectOptions}>
            {['Newest', 'Oldest'].map((option) => (
              <div
                key={option}
                className={styles.sortOptionItem}
                onClick={() => {
                  setSort(option);
                  onSortChange?.(option);
                  setSortOpen(false);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}