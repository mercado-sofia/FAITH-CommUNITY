"use client"

import { useState, useRef, useEffect } from "react"
import styles from "./styles/SearchAndFilter.module.css"

export default function SearchAndFilter({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  programFilter,
  onProgramFilterChange,
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showProgramDropdown, setShowProgramDropdown] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [hasSearched, setHasSearched] = useState(false)

  const statusDropdownRef = useRef(null)
  const programDropdownRef = useRef(null)

  const statusOptions = ["All", "Pending", "Approved", "Declined"]
  const programOptions = [
    "All",
    "Youth Mentoring",
    "Environmental Cleanup",
    "Senior Care",
    "Literacy Program",
    "Animal Care",
    "Food Distribution",
  ]

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false)
      }
      if (programDropdownRef.current && !programDropdownRef.current.contains(event.target)) {
        setShowProgramDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchClick = () => {
    if (hasSearched && searchQuery) {
      // Clear search
      setInputValue("")
      setHasSearched(false)
      onSearchChange("")
    } else {
      // Perform search
      onSearchChange(inputValue)
      setHasSearched(true)
    }
  }

  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    // Clear search results when input is empty
    if (e.target.value === "") {
      onSearchChange("")
      setHasSearched(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (inputValue.trim()) {
        onSearchChange(inputValue)
        setHasSearched(true)
      }
    }
  }

  // Update hasSearched state when searchQuery changes externally
  useEffect(() => {
    setHasSearched(searchQuery !== "")
  }, [searchQuery])

  return (
    <div className={styles.container}>
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search volunteers, programs, etc"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          className={styles.searchInput}
        />

        {hasSearched && searchQuery ? (
          // Show X icon when there's an active search
          <svg
            className={styles.searchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            onClick={handleSearchClick}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Show search icon by default
          <svg
            className={styles.searchIcon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            onClick={handleSearchClick}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        )}
      </div>

      <div className={styles.filterContainer} ref={statusDropdownRef}>
        <button onClick={() => setShowStatusDropdown(!showStatusDropdown)} className={styles.filterButton}>
          Filter by: {statusFilter}
          <svg className={styles.chevronIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStatusDropdown && (
          <div className={styles.dropdown}>
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onStatusFilterChange(option)
                  setShowStatusDropdown(false)
                }}
                className={styles.dropdownItem}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className={styles.filterContainer} ref={programDropdownRef}>
        <button onClick={() => setShowProgramDropdown(!showProgramDropdown)} className={styles.filterButton}>
          Program: {programFilter}
          <svg className={styles.chevronIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showProgramDropdown && (
          <div className={styles.dropdown}>
            {programOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  onProgramFilterChange(option)
                  setShowProgramDropdown(false)
                }}
                className={styles.dropdownItem}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}