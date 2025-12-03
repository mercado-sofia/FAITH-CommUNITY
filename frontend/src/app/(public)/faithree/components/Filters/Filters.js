'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaChevronRight } from 'react-icons/fa';
import styles from './Filters.module.css';

function Filters({
  organizations = [],
  years = [],
  selectedOrganization = null,
  selectedYear = null,
  onOrganizationChange,
  onYearChange,
  theme = 'morning',
}) {
  const [orgExpanded, setOrgExpanded] = useState(false);
  const [yearExpanded, setYearExpanded] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  
  const yearDropdownRef = useRef(null);

  // Close year dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setYearDropdownOpen(false);
      }
    };

    if (yearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [yearDropdownOpen]);

  // Get display text for year dropdown
  const yearDisplayText = selectedYear ? selectedYear.toString() : 'All Years';

  // Sort years descending (newest first)
  const sortedYears = [...years].sort((a, b) => b - a);

  return (
    <div className={styles.filtersWrapper}>
      {/* Organization Filter - Separate Container */}
      {organizations.length > 0 && (
        <div className={`${styles.filterContainer} ${styles.organizationFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <div 
            className={styles.filterHeader}
            onClick={() => setOrgExpanded(!orgExpanded)}
          >
            <span className={styles.filterTitle}>Organization</span>
            <FaChevronRight 
              className={`${styles.expandIcon} ${orgExpanded ? styles.expandIconOpen : ''}`} 
            />
          </div>
          
          {orgExpanded && (
            <div className={styles.filterContent}>
              <div className={styles.filterChips}>
                <button
                  className={`${styles.filterChip} ${selectedOrganization === null ? styles.active : ''}`}
                  onClick={() => onOrganizationChange(null)}
                  aria-label="Show all organizations"
                  aria-pressed={selectedOrganization === null}
                >
                  All
                </button>
                {organizations.map((org) => (
                  <button
                    key={org.id || `org-${org.acronym}`}
                    className={`${styles.filterChip} ${selectedOrganization === org.id ? styles.active : ''}`}
                    onClick={() => onOrganizationChange(org.id)}
                    aria-label={`Filter by ${org.name}`}
                    aria-pressed={selectedOrganization === org.id}
                  >
                    {org.logo && (
                      <span className={styles.orgLogo}>
                        <Image
                          src={org.logo}
                          alt={org.acronym}
                          width={18}
                          height={18}
                          className={styles.orgLogoImage}
                        />
                      </span>
                    )}
                    <span className={styles.chipText}>{org.acronym}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Year Filter - Separate Container */}
      {years.length > 0 && (
        <div className={`${styles.filterContainer} ${styles.yearFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <div 
            className={styles.filterHeader}
            onClick={() => setYearExpanded(!yearExpanded)}
          >
            <span className={styles.filterTitle}>Year</span>
            <FaChevronRight 
              className={`${styles.expandIcon} ${yearExpanded ? styles.expandIconOpen : ''}`} 
            />
          </div>
          
          {yearExpanded && (
            <div className={styles.filterContent}>
              <div className={styles.yearDropdownWrapper} ref={yearDropdownRef}>
                <div
                  className={styles.yearDropdownHeader}
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                >
                  <span>{yearDisplayText}</span>
                  <FaChevronRight 
                    className={`${styles.dropdownIcon} ${yearDropdownOpen ? styles.dropdownIconOpen : ''}`} 
                  />
                </div>

                {yearDropdownOpen && (
                  <div className={styles.yearDropdownOptions}>
                    <div
                      className={`${styles.yearOption} ${selectedYear === null ? styles.yearOptionActive : ''}`}
                      onClick={() => {
                        onYearChange(null);
                        setYearDropdownOpen(false);
                      }}
                    >
                      All Years
                    </div>
                    {sortedYears.map((year) => (
                      <div
                        key={year}
                        className={`${styles.yearOption} ${selectedYear === year ? styles.yearOptionActive : ''}`}
                        onClick={() => {
                          onYearChange(year);
                          setYearDropdownOpen(false);
                        }}
                      >
                        {year}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Filters;
