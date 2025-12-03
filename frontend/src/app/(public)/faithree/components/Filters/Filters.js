'use client';

import Image from 'next/image';
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
  return (
    <div className={`${styles.filtersContainer} ${styles[`filters${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
      {/* Organization Filter */}
      {organizations.length > 0 && (
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Organization</label>
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
                      width={20}
                      height={20}
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

      {/* Year Filter */}
      {years.length > 0 && (
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="year-select">Year</label>
          <select
            id="year-select"
            className={`${styles.yearDropdown} ${theme === 'rainy' ? styles.yearDropdownRainy : ''}`}
            value={selectedYear || ''}
            onChange={(e) => onYearChange(e.target.value === '' ? null : parseInt(e.target.value))}
            aria-label="Filter by year"
          >
            <option value="">All Years</option>
            {years
              .sort((a, b) => b - a) // Sort descending (newest first)
              .map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default Filters;

