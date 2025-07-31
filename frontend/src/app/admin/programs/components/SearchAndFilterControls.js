'use client';

import { useState } from 'react';
import { FaSearch, FaTimes, FaFilter, FaSort } from 'react-icons/fa';
import styles from './styles/SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  searchQuery,
  statusFilter,
  categoryFilter,
  sortBy,
  showCount,
  onSearchChange,
  onFilterChange,
  totalCount,
  filteredCount
}) => {
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const handleClearSearch = () => {
    onSearchChange('');
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'outreach', label: 'Outreach' },
    { value: 'education', label: 'Education' },
    { value: 'health', label: 'Health' },
    { value: 'environment', label: 'Environment' },
    { value: 'community', label: 'Community Development' },
    { value: 'youth', label: 'Youth Programs' },
    { value: 'women', label: 'Women Empowerment' },
    { value: 'elderly', label: 'Elderly Care' },
    { value: 'disaster', label: 'Disaster Relief' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const sortOptions = [
    { value: 'latest', label: 'Latest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'status', label: 'Status' }
  ];

  const showOptions = [
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 15, label: '15' },
    { value: 20, label: '20' },
    { value: 50, label: '50' }
  ];

  return (
    <div className={styles.controlsContainer}>
      {/* Search Bar */}
      <div className={styles.searchSection}>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by title, description, or category..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className={styles.clearButton}
              type="button"
            >
              <FaTimes />
            </button>
          )}
        </div>
        
        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className={`${styles.filterToggle} ${isFilterExpanded ? styles.active : ''}`}
        >
          <FaFilter /> Filters
        </button>
      </div>

      {/* Filter Controls */}
      <div className={`${styles.filtersSection} ${isFilterExpanded ? styles.expanded : ''}`}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Show:</label>
            <select
              value={showCount}
              onChange={(e) => onFilterChange('show', e.target.value)}
              className={styles.filterSelect}
            >
              {showOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => onFilterChange('category', e.target.value)}
              className={styles.filterSelect}
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className={styles.filterSelect}
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>
              <FaSort /> Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => onFilterChange('sort', e.target.value)}
              className={styles.filterSelect}
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className={styles.resultsInfo}>
        <span className={styles.resultsText}>
          Showing {filteredCount} of {totalCount} programs
        </span>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
