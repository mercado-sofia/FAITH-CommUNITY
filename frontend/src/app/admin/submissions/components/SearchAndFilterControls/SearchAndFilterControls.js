"use client"

import { useState, useEffect } from "react"
import { FiChevronDown, FiSearch, FiX } from "react-icons/fi"
import { BsSortUp, BsSortDown } from "react-icons/bs"
import styles from "./SearchAndFilterControls.module.css"

export default function SearchAndFilterControls({
  showCount,
  onShowCountChange,
  sectionFilter,
  onSectionFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortOrderChange,
}) {
  const [showDropdown, setShowDropdown] = useState(null)
  const [localQuery, setLocalQuery] = useState(searchQuery || '')
  const statusOptions = ['All', 'Pending', 'Approved', 'Rejected']
  const sectionOptions = ['All', 'Programs', 'Highlights', 'Post Act Report']

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

        {/* Section filter */}
        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "section" ? styles.open : ""}`}
            onClick={() => toggleDropdown("section")}
          >
            <span className={styles.sectionLabel}>Section:</span>
            <span className={styles.sectionValue}>{sectionFilter}</span>
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "section" && (
            <ul className={styles.options}>
              {sectionOptions.map((section) => (
                <li key={section} onClick={() => {
                  onSectionFilterChange(section)
                  setShowDropdown(null)
                }}>
                  {section}
                </li>
              ))}
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
        {/* Search input */}
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSearchChange(localQuery)
              }
            }}
            className={styles.searchInput}
          />
          {localQuery ? (
            <FiX className={styles.clearIcon} onClick={() => {
              setLocalQuery('')
              onSearchChange('')
            }} />
          ) : (
            <FiSearch className={styles.searchIcon} onClick={() => onSearchChange(localQuery)} />
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
