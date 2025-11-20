"use client"

import { useState, useEffect } from "react"
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi"
import { BsSortUp, BsSortDown } from "react-icons/bs"
import { sanitizeInput } from "../../../utils"
import styles from "./SearchAndFilterControls.module.css"

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
  const statusOptions = ['All', 'Pending', 'Approved', 'Declined', 'Cancelled']

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
              className={`${styles.dropdown} ${showDropdown === "show" ? styles.open : ""}`}
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
            className={`${styles.programDropdown} ${showDropdown === "program" ? styles.open : ""}`}
            onClick={() => toggleDropdown("program")}
          >
            <span className={styles.programLabel}>Programs:</span>
            <span className={styles.programValue}>
            {programsLoading ? "Loading..." : programFilter}
            </span>
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "program" && (
            <ul className={styles.options}>
              <li key="all" onClick={() => {
                onProgramFilterChange("All")
                setShowDropdown(null)
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
            className={`${styles.dropdown} ${showDropdown === "status" ? styles.open : ""}`}
            onClick={() => toggleDropdown("status")}
          >
            <span className={styles.statusLabel}>Status:</span>
            <span className={styles.statusValue}>{statusFilter}</span>
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

        {/* Sort Button */}
        <button
          className={styles.sortButton}
          onClick={() => {
            const newSort = sortOrder === 'latest' ? 'oldest' : 'latest';
            onSortOrderChange(newSort);
          }}
          title={sortOrder === 'latest' ? 'Sort: Newest First' : 'Sort: Oldest First'}
        >
          {sortOrder === 'latest' ? (
            <BsSortUp className={styles.sortIcon} />
          ) : (
            <BsSortDown className={styles.sortIcon} />
          )}
        </button>
      </div>
    </div>
  )
}