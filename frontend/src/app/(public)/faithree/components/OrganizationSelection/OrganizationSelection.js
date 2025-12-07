'use client';

import Image from 'next/image';
import styles from './OrganizationSelection.module.css';

function OrganizationSelection({ organizations, selectedOrganization, onOrganizationChange }) {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.headerImage}>
          <Image 
            src="/assets/backgrounds/welcome-faithree/txt2.svg" 
            alt="SELECT ORGANIZATION" 
            width={800}
            height={224}
            priority
          />
        </div>
        
        <div className={styles.organizationFilterContainer}>
          <div className={styles.filterMessage}>
            <p className={styles.filterMessageText}>
              Choose an organization to display their tree
            </p>
          </div>
          
          <div className={styles.filterChipsContainer}>
            {organizations.map((org) => (
              <button
                key={org.id || `org-${org.acronym}`}
                className={`${styles.filterChip} ${selectedOrganization === org.id ? styles.filterChipActive : ''}`}
                onClick={() => onOrganizationChange(org.id)}
                aria-label={`Select ${org.name}`}
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
                <span className={styles.chipText}>
                  {org.acronym}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrganizationSelection;