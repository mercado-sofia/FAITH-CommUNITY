'use client'

import { useEffect, useRef, useState } from 'react'
import { FiChevronDown } from 'react-icons/fi'
import styles from './styles/FilterControls.module.css'

const programOptions = ['All', 'Program 1', 'Program 2']
const statusOptions = ['All status', 'Pending', 'Approved', 'Declined']
const showOptions = [10, 25, 50, 100]

export default function FilterControls({
  showCount,
  onShowCountChange,
  programFilter,
  onProgramFilterChange,
  statusFilter,
  onStatusFilterChange
}) {
  const [showDropdown, setShowDropdown] = useState(null)

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
    <div className={styles.filtersRow}>
      {/* Show count */}
      <div className={styles.dropdownWrapper}>
        <span className={styles.inlineLabel}>Show</span>
        <div className={styles.dropdownButtonWrapper}>
          <div className={styles.dropdown} onClick={() => toggleDropdown('show')}>
            {showCount}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === 'show' && (
            <ul className={styles.options}>
              {showOptions.map((num) => (
                <li key={num} onClick={() => { onShowCountChange(num); setShowDropdown(null); }}>
                  {num}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Program filter */}
      <div className={styles.dropdownWrapper}>
        <div className={styles.dropdown} onClick={() => toggleDropdown('program')}>
          {programFilter === 'All' ? 'All Programs' : programFilter}
          <FiChevronDown className={styles.icon} />
        </div>
        {showDropdown === 'program' && (
          <ul className={styles.options}>
            {programOptions.map((opt) => (
              <li key={opt} onClick={() => { onProgramFilterChange(opt); setShowDropdown(null); }}>
                {opt === 'All' ? 'All Programs' : opt}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Status filter */}
      <div className={styles.dropdownWrapper}>
        <div className={styles.dropdown} onClick={() => toggleDropdown('status')}>
          {statusFilter === 'all status'
            ? 'All status'
            : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
          <FiChevronDown className={styles.icon} />
        </div>
        {showDropdown === 'status' && (
          <ul className={styles.options}>
            {statusOptions.map((opt) => (
              <li
                key={opt}
                onClick={() => {
                  onStatusFilterChange(opt.toLowerCase())
                  setShowDropdown(null)
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}