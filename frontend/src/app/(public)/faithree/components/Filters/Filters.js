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
  showAllYears = false,
  onOrganizationChange,
  onYearChange,
  theme = 'morning',
  isCentered = false, // New prop for centered mode
}) {
  // In centered mode, org filter should be expanded by default
  const [orgExpanded, setOrgExpanded] = useState(isCentered);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  
  const yearDropdownRef = useRef(null);

  // Update orgExpanded when isCentered changes
  useEffect(() => {
    if (isCentered) {
      setOrgExpanded(true);
    }
  }, [isCentered]);

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
  const yearDisplayText = selectedYear ? selectedYear.toString() : 'Select Year';

  // Sort years descending (newest first)
  const sortedYears = [...years].sort((a, b) => b - a);

  // Determine font sizes based on number of organizations
  // Few orgs (<= 6): larger fonts, Many orgs (> 6): smaller fonts
  const orgCount = organizations.length;
  const isFewOrgs = orgCount <= 6;
  const messageFontSize = isFewOrgs ? '1.25rem' : '1rem';
  const chipFontSize = isFewOrgs ? '1.125rem' : '0.875rem';
  const chipPadding = isFewOrgs ? '0.75rem 1.5rem' : '0.625rem 1.25rem';

  // Handle year selection
  const handleYearChange = (year) => {
    onYearChange({ year, showAllYears });
    setYearDropdownOpen(false);
  };

  // Handle year filter mode change (radio button selection)
  const handleYearFilterModeChange = (mode) => {
    if (mode === 'all') {
      onYearChange({ year: null, showAllYears: true });
    } else {
      onYearChange({ year: selectedYear, showAllYears: false });
    }
  };

  return (
    <div className={`${styles.filtersWrapper} ${isCentered ? styles.centeredWrapper : ''}`}>
      {/* Organization Filter - Separate Container */}
      {organizations.length > 0 && (
        <div className={`${styles.filterContainer} ${styles.organizationFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]} ${isCentered ? styles.centeredFilter : ''}`}>
          {isCentered && (
            <div className={styles.centeredMessage}>
              <p 
                className={styles.centeredMessageText}
                style={{ fontSize: messageFontSize }}
              >
                Choose an organization to display their tree
              </p>
            </div>
          )}
          {!isCentered && (
            <div 
              className={styles.filterHeader}
              onClick={() => setOrgExpanded(!orgExpanded)}
            >
              <span className={styles.filterTitle}>Organization</span>
              <FaChevronRight 
                className={`${styles.expandIcon} ${orgExpanded ? styles.expandIconOpen : ''}`} 
              />
            </div>
          )}
          
          {orgExpanded && (
            <div className={styles.filterContent}>
              <div className={styles.filterChips}>
                {organizations.map((org) => (
                  <button
                    key={org.id || `org-${org.acronym}`}
                    className={`${styles.filterChip} ${selectedOrganization === org.id ? styles.active : ''}`}
                    onClick={() => onOrganizationChange(org.id)}
                    aria-label={`Filter by ${org.name}`}
                    aria-pressed={selectedOrganization === org.id}
                    style={isCentered ? { fontSize: chipFontSize, padding: chipPadding } : {}}
                  >
                    {org.logo && (
                      <span className={styles.orgLogo}>
                        <Image
                          src={org.logo}
                          alt={org.acronym}
                          width={20}
                          height={20}
                          className={styles.orgLogoImage}
                        />
                      </span>
                    )}
                    <span 
                      className={styles.chipText}
                      style={isCentered ? { fontSize: chipFontSize } : {}}
                    >
                      {org.acronym}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Year Filter - Radio Buttons with Conditional Dropdown */}
      {/* Hide year filter in centered mode */}
      {!isCentered && years.length > 0 && (
        <div className={`${styles.filterContainer} ${styles.yearFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <div className={styles.filterContent}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.875rem', color: theme === 'rainy' ? '#E0F6FF' : '#1b5e20', marginBottom: '0.75rem', display: 'block', fontWeight: 700, fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
                Year
              </label>

              {/* Radio Button Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {/* Show All Years Radio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    id="showAllYears"
                    name="yearFilterMode"
                    checked={showAllYears}
                    onChange={() => handleYearFilterModeChange('all')}
                  />
                  <label htmlFor="showAllYears">
                    Show All Years
                  </label>
                </div>

                {/* Pick a Year Radio */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="radio"
                    id="pickAYear"
                    name="yearFilterMode"
                    checked={!showAllYears}
                    onChange={() => handleYearFilterModeChange('pick')}
                  />
                  <label htmlFor="pickAYear">
                    Pick a Year
                  </label>
                </div>
              </div>

              {/* Year Dropdown - Only show when "Pick a Year" is selected */}
              {!showAllYears && (
                <div className={styles.yearDropdownWrapper} ref={yearDropdownRef} style={{ marginTop: '0.5rem' }}>
                  <div
                    className={styles.yearDropdownHeader}
                    onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                    style={{ cursor: 'pointer' }}
                  >
                    <span>{yearDisplayText}</span>
                    <FaChevronRight 
                      className={`${styles.dropdownIcon} ${yearDropdownOpen ? styles.dropdownIconOpen : ''}`} 
                    />
                  </div>

                  {yearDropdownOpen && (
                    <div 
                      className={styles.yearDropdownOptions}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {sortedYears.map((year) => (
                        <div
                          key={year}
                          className={`${styles.yearOption} ${selectedYear === year ? styles.yearOptionActive : ''}`}
                          onClick={() => handleYearChange(year)}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Filters;
