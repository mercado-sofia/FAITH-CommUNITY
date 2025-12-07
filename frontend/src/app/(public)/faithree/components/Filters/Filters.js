'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FaChevronRight, FaFilter, FaTimes } from 'react-icons/fa';
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
  hideMobileToggle = false, // When true, hides toggle button and drawer (for desktop sidebar)
}) {
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const orgDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const drawerRef = useRef(null);

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

  // Toggle drawer function
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  // Close drawer function
  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Close drawer on ESC key press
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isDrawerOpen) {
        closeDrawer();
      }
    };

    if (isDrawerOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isDrawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isDrawerOpen]);

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

  // Filter controls content (to be reused in both desktop and drawer)
  const filterControls = (
    <>
      {/* Organization Filter - Dropdown Button */}
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

      {/* Year Filter - Dropdown */}
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
    </>
  );

  return (
    <>
      {/* Toggle Button - Mobile Only (hidden when hideMobileToggle is true) */}
      {!hideMobileToggle && (
        <button
          className={styles.filterToggleButton}
          onClick={toggleDrawer}
          aria-label="Toggle filters"
        >
          <FaFilter className={styles.filterToggleIcon} />
        </button>
      )}

      {/* Overlay/Backdrop */}
      {!hideMobileToggle && isDrawerOpen && (
        <div
          className={styles.filterDrawerOverlay}
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel - Mobile Only (hidden when hideMobileToggle is true) */}
      {!hideMobileToggle && (
        <div
          ref={drawerRef}
          className={`${styles.filterDrawer} ${isDrawerOpen ? styles.filterDrawerOpen : ''}`}
        >
          <div className={styles.filterDrawerHeader}>
            <h2 className={styles.filterDrawerTitle}>Filters</h2>
            <button
              className={styles.filterDrawerCloseButton}
              onClick={closeDrawer}
              aria-label="Close filters"
            >
              <FaTimes className={styles.filterDrawerCloseIcon} />
            </button>
          </div>
          <div className={styles.filterDrawerContent}>
            {filterControls}
          </div>
        </div>
      )}

      {/* Desktop View - Filters Wrapper (hidden on mobile) */}
      <div className={styles.filtersWrapper}>
        {filterControls}
      </div>
    </>
  );
}

export default Filters;