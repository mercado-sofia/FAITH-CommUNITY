"use client";

import styles from './SearchAndFilterBar.module.css';
import { FiSearch, FiX } from 'react-icons/fi';
import { FaChevronRight } from 'react-icons/fa';
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

  const filterRefDesktop = useRef(null);
  const filterRefMobile = useRef(null);
  const sortRefDesktop = useRef(null);
  const sortRefMobile = useRef(null);

  const handleSearch = () => {
    onSearch?.(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch?.('');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isFilterClick = 
        (filterRefDesktop.current && filterRefDesktop.current.contains(event.target)) ||
        (filterRefMobile.current && filterRefMobile.current.contains(event.target));
      
      const isSortClick = 
        (sortRefDesktop.current && sortRefDesktop.current.contains(event.target)) ||
        (sortRefMobile.current && sortRefMobile.current.contains(event.target));
      
      if (!isFilterClick) {
        setDropdownOpen(false);
      }
      if (!isSortClick) {
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

  // Filter dropdown component (reusable)
  const FilterDropdown = ({ className, innerRef }) => (
    <div className={className} ref={innerRef}>
      <div
        className={styles.customSelectHeader}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        {filter === 'All' ? 'All Category' : filter}
        <FaChevronRight className={`${styles.dropdownIcon} ${dropdownOpen ? styles.dropdownIconOpen : ''}`} />
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
  );

  // Sort dropdown component (reusable)
  const SortDropdown = ({ className, innerRef }) => (
    <div className={className} ref={innerRef}>
      <div
        className={styles.sortSelectHeader}
        onClick={() => setSortOpen(!sortOpen)}
      >
        {sort}
        <FaChevronRight className={`${styles.sortdropdownIcon} ${sortOpen ? styles.sortdropdownIconOpen : ''}`} />
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
  );

  return (
    <div className={styles.searchContainer}>
      {/* Search bar with filter (desktop/tablet) or without filter (mobile) */}
      <div className={styles.searchBar}>
        {/* Filter dropdown - desktop/tablet: inside search bar */}
        <FilterDropdown 
          className={`${styles.customSelectWrapper} ${styles.filterDesktop}`} 
          innerRef={filterRefDesktop} 
        />

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

      {/* Filter and Sort controls - mobile: below search bar */}
      <div className={styles.mobileControls}>
        <FilterDropdown 
          className={`${styles.customSelectWrapper} ${styles.filterMobile}`} 
          innerRef={filterRefMobile} 
        />
        <SortDropdown 
          className={`${styles.sortSelectWrapper} ${styles.sortMobile}`} 
          innerRef={sortRefMobile} 
        />
      </div>

      {/* Sort dropdown - desktop/tablet: outside search bar */}
      <SortDropdown 
        className={`${styles.sortSelectWrapper} ${styles.sortDesktop}`} 
        innerRef={sortRefDesktop} 
      />
    </div>
  );
}