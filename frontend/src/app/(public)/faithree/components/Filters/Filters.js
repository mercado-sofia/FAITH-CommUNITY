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
          <label className={styles.filterLabel}>Year</label>
          <div className={styles.filterChips}>
            <button
              className={`${styles.filterChip} ${selectedYear === null ? styles.active : ''}`}
              onClick={() => onYearChange(null)}
              aria-label="Show all years"
              aria-pressed={selectedYear === null}
            >
              All
            </button>
            {years
              .sort((a, b) => b - a) // Sort descending (newest first)
              .map((year) => (
                <button
                  key={year}
                  className={`${styles.filterChip} ${selectedYear === year ? styles.active : ''}`}
                  onClick={() => onYearChange(year)}
                  aria-label={`Filter by year ${year}`}
                  aria-pressed={selectedYear === year}
                >
                  {year}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Filters;

