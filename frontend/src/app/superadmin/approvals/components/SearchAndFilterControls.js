'use client';

import { useState, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiX } from 'react-icons/fi';
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

  const handleSearchSubmit = () => {
    onSearchChange(localSearchTerm);
  };

  const handleSearchClear = () => {
    setLocalSearchTerm('');
    onSearchChange('');
  };

  const handleDropdownClick = (dropdownType) => {
    setShowDropdown(showDropdown === dropdownType ? null : dropdownType);
  };

  const handleDropdownOptionClick = (dropdownType, value, urlParam) => {
    setShowDropdown(null);
    onUpdateURLParams({ [urlParam]: value });
  };

  // Handle click outside for dropdowns
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            <ul className={styles.options}>
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
            {orgsLoading ? "Loading..." : selectedOrganization === "all" ? "All Organizations" : selectedOrganization}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "organization" && (
            <ul className={styles.options}>
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onOrganizationChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All Organizations
              </li>
              {organizations.map(org => (
                <li key={org.id} onClick={(e) => {
                  e.stopPropagation();
                  onOrganizationChange({ target: { value: org.acronym } });
                  setShowDropdown(null);
                }}>
                  {org.acronym} - {org.name.length > 30 ? org.name.substring(0, 30) + "..." : org.name}
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
            {selectedSection === "all" ? "All Section" : selectedSection.charAt(0).toUpperCase() + selectedSection.slice(1)}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "section" && (
            <ul className={styles.options}>
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onSectionChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All Section
              </li>
              {["programs", "competency", "advocacy", "collaborative_programs"].map((section) => (
                <li key={section} onClick={(e) => {
                  e.stopPropagation();
                  onSectionChange({ target: { value: section } });
                  setShowDropdown(null);
                }}>
                  {section === 'collaborative_programs' ? 'Collaborative Programs' : section.charAt(0).toUpperCase() + section.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "status" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("status")}
          >
            {selectedStatus === "all" ? "All Status" : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "status" && (
            <ul className={styles.options}>
              <li key="all" onClick={(e) => {
                e.stopPropagation();
                onStatusChange({ target: { value: "all" } });
                setShowDropdown(null);
              }}>
                All Status
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

        <div className={styles.dropdownWrapper}>
          <div
            className={`${styles.dropdown} ${showDropdown === "sort" ? styles.open : ""}`}
            onClick={() => handleDropdownClick("sort")}
          >
            Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
            <FiChevronDown className={styles.icon} />
          </div>
          {showDropdown === "sort" && (
            <ul className={styles.options}>
              {["latest", "oldest"].map((option) => (
                <li key={option} onClick={(e) => {
                  e.stopPropagation();
                  onSortChange({ target: { value: option } });
                  setShowDropdown(null);
                }}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchAndFilterControls;
