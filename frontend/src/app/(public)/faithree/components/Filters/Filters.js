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
  onImpactLevelClick = null, // Callback for Impact Level toggle (mobile only)
}) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  
  const orgDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  // Close organization dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target)) {
        setOrgDropdownOpen(false);
      }
    };

    if (orgDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [orgDropdownOpen]);

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

  // Get display text for organization dropdown
  const selectedOrg = organizations.find(org => org.id === selectedOrganization);
  const orgDisplayText = selectedOrg ? selectedOrg.acronym : 'Select Organization';

  // Get display text for year dropdown
  const yearDisplayText = showAllYears ? 'All Years' : (selectedYear ? selectedYear.toString() : 'Select Year');

  // Sort years descending (newest first)
  const sortedYears = [...years].sort((a, b) => b - a);

  // Handle organization selection
  const handleOrganizationChange = (orgId) => {
    onOrganizationChange(orgId);
    setOrgDropdownOpen(false);
  };

  // Handle year selection
  const handleYearChange = (value) => {
    if (value === 'all') {
      onYearChange({ year: null, showAllYears: true });
    } else {
      onYearChange({ year: value, showAllYears: false });
    }
    setYearDropdownOpen(false);
  };

  return (
    <div className={styles.filtersContainer}>
      {/* Organization Filter - Top Left */}
      {organizations.length > 0 && (
        <div className={`${styles.organizationFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <div 
            className={styles.orgDropdownWrapper} 
            ref={orgDropdownRef}
          >
            <div
              className={`${styles.orgDropdownHeader} ${selectedOrganization ? styles.orgDropdownHeaderSelected : ''}`}
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.orgDropdownHeaderContent}>
                {selectedOrg && selectedOrg.logo && (
                  <span className={styles.orgDropdownLogo}>
                    <Image
                      src={selectedOrg.logo}
                      alt={selectedOrg.acronym}
                      width={20}
                      height={20}
                      className={styles.orgDropdownLogoImage}
                    />
                  </span>
                )}
                <span>{orgDisplayText}</span>
              </div>
              <FaChevronRight 
                className={`${styles.dropdownIcon} ${orgDropdownOpen ? styles.dropdownIconOpen : ''}`} 
              />
            </div>

            {orgDropdownOpen && (
              <div 
                className={styles.orgDropdownOptions}
                onClick={(e) => e.stopPropagation()}
              >
                {organizations.map((org) => (
                  <div
                    key={org.id || `org-${org.acronym}`}
                    className={`${styles.orgOption} ${selectedOrganization === org.id ? styles.orgOptionActive : ''}`}
                    onClick={() => handleOrganizationChange(org.id)}
                  >
                    {org.logo && (
                      <span className={styles.orgOptionLogo}>
                        <Image
                          src={org.logo}
                          alt={org.acronym}
                          width={20}
                          height={20}
                          className={styles.orgOptionLogoImage}
                        />
                      </span>
                    )}
                    <span className={styles.orgOptionText}>{org.acronym}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Year Filter - Top Left (below org on mobile) */}
      {years.length > 0 && (
        <div className={`${styles.yearFilter} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <div 
            className={styles.yearDropdownWrapper} 
            ref={yearDropdownRef}
          >
            <div
              className={`${styles.yearDropdownHeader} ${(showAllYears || selectedYear) ? styles.yearDropdownHeaderSelected : ''}`}
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
                {/* All Years option */}
                <div
                  className={`${styles.yearOption} ${showAllYears ? styles.yearOptionActive : ''}`}
                  onClick={() => handleYearChange('all')}
                >
                  All Years
                </div>
                {/* Year options */}
                {sortedYears.map((year) => (
                  <div
                    key={year}
                    className={`${styles.yearOption} ${selectedYear === year && !showAllYears ? styles.yearOptionActive : ''}`}
                    onClick={() => handleYearChange(year)}
                  >
                    {year}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Impact Level Toggle - Mobile only, appears as third row in filters */}
      {onImpactLevelClick && (
        <button
          className={`${styles.impactLevelToggleButton} ${styles[`filter${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
          onClick={onImpactLevelClick}
          aria-label="Open Impact Level information"
        >
          <span>Impact Level</span>
        </button>
      )}
    </div>
  );
}

export default Filters;