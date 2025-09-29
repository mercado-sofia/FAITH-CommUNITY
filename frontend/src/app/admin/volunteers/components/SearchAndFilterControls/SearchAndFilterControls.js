"use client"

import { useState, useEffect } from "react"
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi"
import styles from "./SearchAndFilterControls.module.css"

// Input sanitization utility
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[<>]/g, '').substring(0, 100); // Basic XSS protection + length limit
};

export default function SearchAndFilterControls({
  showCount,
  onShowCountChange,
  programFilter,
  onProgramFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortOrderChange,
  programs = [],
  programsLoading = false,
}) {
  const [showDropdown, setShowDropdown] = useState(null)
  const [localQuery, setLocalQuery] = useState(searchQuery || '')
  const sortOptions = ['Latest', 'Oldest']
  const statusOptions = ['All status', 'Pending', 'Approved', 'Declined', 'Cancelled']

  const toggleDropdown = (key) => {
    setShowDropdown((prev) => (prev === key ? null : key))
  }

  const handleClickOutside = (e) => {
    if (!e.target.closest(`.${styles.dropdownWrapper}`)) {
      setShowDropdown(null)
    }
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Enhanced search input handler with sanitization
  const handleSearchInputChange = (e) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    setLocalQuery(sanitizedValue);
  };

  const handleSearchSubmit = () => {
    const sanitizedQuery = sanitizeInput(localQuery);
    onSearchChange(sanitizedQuery);
  };

  const handleClearSearch = () => {
    setLocalQuery('');
    onSearchChange('');
  };

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
                {[5, 10, 15, 20].map((count) => (
                  <li key={count} onClick={() => {
                    onShowCountChange(count)
                    setShowDropdown(null)
                  }}>
                    {count}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Program filter */}
        <div className={styles.dropdownWrapper}>
          <div
            className={styles.programDropdown}
            onClick={() => toggleDropdown("program")}
          >
            {programsLoading ? "Loading..." : programFilter}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "program" && (
            <ul className={styles.options}>
              <li key="all" onClick={() => {
                onProgramFilterChange("All Programs")
                setShowDropdown(null)
              }}>
                All Programs
              </li>
              {programsLoading ? (
                <li style={{ color: '#666', fontStyle: 'italic' }}>Loading programs...</li>
              ) : programs.length === 0 ? (
                <li style={{ color: '#666', fontStyle: 'italic' }}>No programs found</li>
              ) : (
                programs.map((program) => (
                  <li key={program.id} onClick={() => {
                    onProgramFilterChange(program.title)
                    setShowDropdown(null)
                  }}>
                    {program.title}
                  </li>
                ))
              )}
            </ul>
          )}
        </div>

        {/* Status filter */}
        <div className={styles.dropdownWrapper}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("status")}
          >
            {statusFilter}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "status" && (
            <ul className={styles.options}>
              {statusOptions.map((status) => (
                <li key={status} onClick={() => {
                  onStatusFilterChange(status)
                  setShowDropdown(null)
                }}>
                  {status}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Search and Sort */}
      <div className={styles.searchWrapper}>
        {/* Search input with sanitization */}
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Search"
            value={localQuery}
            onChange={handleSearchInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchSubmit();
              }
            }}
            className={styles.searchInput}
            maxLength={100} // Additional length protection
          />
          {localQuery ? (
            <FiX className={styles.clearIcon} onClick={handleClearSearch} />
          ) : (
            <FiSearch className={styles.searchIcon} onClick={handleSearchSubmit} />
          )}
        </div>

        {/* Sort Dropdown */}
        <div className={styles.dropdownWrapper} style={{ marginLeft: '1rem' }}>
          <div
            className={styles.dropdown}
            onClick={() => toggleDropdown("sort")}
          >
            Sort: {sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "sort" && (
            <ul className={styles.options}>
              {sortOptions.map((option) => (
                <li key={option} onClick={() => {
                  onSortOrderChange(option.toLowerCase())
                  setShowDropdown(null)
                }}>
                  {option}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}