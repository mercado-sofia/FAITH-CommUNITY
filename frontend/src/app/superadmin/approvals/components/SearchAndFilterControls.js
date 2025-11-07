'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
import { BsSortDown, BsSortUp } from 'react-icons/bs';
import styles from './styles/SearchAndFilterControls.module.css';

const SearchAndFilterControls = ({
  // Filter states
  selectedOrganization,
  selectedSection,
  selectedStatus,
  searchTerm,
  sortBy,
  showEntries,
  
  // Organizations data
  organizations,
  orgsLoading,
  
  // Available sections from data
  availableSections,
  
  // Dropdown state
  showDropdown,
  setShowDropdown,
  
  // Event handlers
  onOrganizationChange,
  onSectionChange,
  onStatusChange,
  onSearchChange,
  onSortChange,
  onShowEntriesChange,
  onUpdateURLParams
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm || '');

  // Update local search term when prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm || '');
  }, [searchTerm]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearchTerm);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearchTerm, onSearchChange]);

  const handleSearchClear = () => {
    setLocalSearchTerm('');
    onSearchChange('');
  };

  const handleDropdownClick = (dropdownType) => {
    setShowDropdown(showDropdown === dropdownType ? null : dropdownType);
  };

  // Handle click outside and scroll for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target || !e.target.closest) {
        return;
      }
      
      // Don't close if clicking on dropdown options or inside dropdown containers
      if (e.target.closest(`.${styles.options}`) ||
          e.target.closest(`.${styles.dropdownWrapper}`)) {
        return;
      }
      
      setShowDropdown(null);
    };

    const handleScroll = (e) => {
      // Don't close dropdown if scrolling inside the options list or dropdown wrapper
      if (!showDropdown) return;
      
      // Check if any dropdown is currently open within SearchAndFilterControls
      const allOpenDropdowns = document.querySelectorAll(`[data-search-filter-controls] .${styles.options}`);
      if (allOpenDropdowns.length === 0) {
        // No dropdowns are open, safe to return
        return;
      }
      
      // Check if the scroll target is inside our component
      const target = e.target || e.currentTarget;
      
      if (target) {
        // Check if scrolling inside dropdown options or wrapper
        if (typeof target.closest === 'function') {
          const optionsList = target.closest(`.${styles.options}`);
          const dropdownWrapper = target.closest(`.${styles.dropdownWrapper}`);
          const searchFilterControls = target.closest('[data-search-filter-controls]');
          
          if (optionsList || dropdownWrapper || searchFilterControls) {
            // Don't close if scrolling inside dropdown options
            return;
          }
        }
        
        // Check if the scroll is happening on the actual scrollable element (ul.options)
        allOpenDropdowns.forEach(dropdown => {
          if (target === dropdown || dropdown.contains(target)) {
            // Scrolling inside the dropdown options list, don't close
            return;
          }
        });
      }
      
      // Only close if scrolling outside our component
      // Don't close if scrolling inside any open dropdown
      if (target && typeof target.closest === 'function') {
        const isInsideDropdown = target.closest(`.${styles.options}`) || 
                                 target.closest(`.${styles.dropdownWrapper}`) ||
                                 target.closest('[data-search-filter-controls]');
        if (!isInsideDropdown) {
          setShowDropdown(null);
        }
      } else if (!target || target === document || target === document.body || target === window) {
        // If scrolling on window/document/body, check if we should close
        // Only close if we're sure we're not inside a dropdown
        const activeElement = document.activeElement;
        if (activeElement && typeof activeElement.closest === 'function') {
          const isInsideDropdown = activeElement.closest(`.${styles.options}`) || 
                                   activeElement.closest(`.${styles.dropdownWrapper}`) ||
                                   activeElement.closest('[data-search-filter-controls]');
          if (!isInsideDropdown) {
            setShowDropdown(null);
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    // Use capture phase to catch scroll events early
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showDropdown, setShowDropdown]);

  return (
    <div className={styles.controlsAndStatsSection} data-search-filter-controls>
      <div className={styles.controlsLeft}>
        <span className={styles.inlineLabel}>Show</span>
        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "show" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("show")}
          >
            {showEntries}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "show" && (
            <ul 
              className={styles.options}
              onWheel={(e) => e.stopPropagation()}
              onScroll={(e) => e.stopPropagation()}
            >
              {[10, 25, 50, 100].map((count) => (
                <li key={count} onClick={(e) => {
                  e.stopPropagation();
                  onShowEntriesChange(count);
                  setShowDropdown(null);
                }}>
                  {count}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.organizationDropdown} ${showDropdown === "organization" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("organization")}
          >
            {orgsLoading ? (
              "Loading..."
            ) : (
              <>
                <span className={styles.organizationLabel}>Organization:</span>
                <span className={styles.organizationValue}>
                  {selectedOrganization === "all" ? "All" : selectedOrganization}
                </span>
              </>
            )}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "organization" && (
            <ul 
              className={styles.options}
              onWheel={(e) => e.stopPropagation()}
              onScroll={(e) => e.stopPropagation()}
            >
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onOrganizationChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All
              </li>
              {organizations.map(org => (
                <li key={org.id} onClick={(e) => {
                  e.stopPropagation();
                  onOrganizationChange({ target: { value: org.acronym } });
                  setShowDropdown(null);
                }}>
                  {org.acronym}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "section" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("section")}
          >
            <span className={styles.sectionLabel}>Section:</span>
            <span className={styles.sectionValue}>
              {selectedSection === "all" ? "All" : selectedSection
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ')}
            </span>
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "section" && (
            <ul 
              className={styles.options}
              onWheel={(e) => e.stopPropagation()}
              onScroll={(e) => e.stopPropagation()}
            >
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onSectionChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All
              </li>
              {(() => {
                // Default sections that should always be available
                // Note: "Post Act Report" uses proper case as stored in database, "highlights" is lowercase
                const defaultSections = ["programs", "competency", "advocacy", "highlights", "Post Act Report"];
                
                // Use availableSections if provided, otherwise use default list
                const sections = availableSections && availableSections.length > 0 
                  ? availableSections 
                  : defaultSections;
                
                // Ensure all default sections are included even if not in availableSections yet
                const allSections = new Set([...sections, ...defaultSections]);
                
                return Array.from(allSections).sort((a, b) => {
                  // Sort alphabetically, but keep consistent ordering
                  return a.toLowerCase().localeCompare(b.toLowerCase());
                }).map((section) => {
                  // Format section name for display (preserve proper case for "Post Act Report")
                  const displayName = section === "Post Act Report" 
                    ? "Post Act Report" 
                    : section
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ');
                  
                  return (
                    <li key={section} onClick={(e) => {
                      e.stopPropagation();
                      // Store the exact section value as it appears in the database
                      onSectionChange({ target: { value: section } });
                      setShowDropdown(null);
                    }}>
                      {displayName}
                    </li>
                  );
                });
              })()}
            </ul>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "status" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("status")}
          >
            <span className={styles.statusLabel}>Status:</span>
            <span className={styles.statusValue}>
              {selectedStatus === "all" ? "All" : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
            </span>
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "status" && (
            <ul 
              className={styles.options}
              onWheel={(e) => e.stopPropagation()}
              onScroll={(e) => e.stopPropagation()}
            >
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onStatusChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All
              </li>
              {["pending", "approved", "rejected"].map((status) => (
                <li key={status} onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange({ target: { value: status } });
                  setShowDropdown(null);
                }}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.searchWrapper}>
        <div className={styles.searchInputContainer}>
          <input
            type="text"
            placeholder="Search"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {localSearchTerm ? (
            <FiX className={styles.clearIcon} onClick={handleSearchClear} />
          ) : (
            <FiSearch className={styles.searchIcon} />
          )}
        </div>

        <button
          className={styles.sortButton}
          onClick={() => {
            const newSort = sortBy === 'latest' ? 'oldest' : 'latest';
            onSortChange({ target: { value: newSort } });
          }}
          title={sortBy === 'latest' ? 'Sort: Newest First' : 'Sort: Oldest First'}
            >
          {sortBy === 'latest' ? (
            <BsSortUp className={styles.sortIcon} />
          ) : (
            <BsSortDown className={styles.sortIcon} />
          )}
        </button>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
