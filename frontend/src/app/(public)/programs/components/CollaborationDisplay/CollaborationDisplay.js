'use client';

import Image from 'next/image';
import Link from 'next/link';
import styles from './CollaborationDisplay.module.css';

export default function CollaborationDisplay({ collaborators, programTitle }) {
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  return (
    <div className={styles.collaborationSection}>
      <div className={styles.collaborationHeader}>
        <div className={styles.collaborationIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.6977C21.7033 16.0413 20.9999 15.5754 20.2 15.366" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M16 3.36603C16.7999 3.57538 17.5033 4.04131 18.0094 4.69767C18.5155 5.35403 18.8 6.16448 18.8 7C18.8 7.83552 18.5155 8.64597 18.0094 9.30233C17.5033 9.95869 16.7999 10.4246 16 10.634" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className={styles.collaborationTitle}>Collaboration Partners</h3>
      </div>
      
      <div className={styles.collaborationDescription}>
        <p>This program is a collaborative effort involving multiple organizations working together to create meaningful impact.</p>
      </div>

      <div className={styles.collaboratorsList}>
        {collaborators.map((collaborator, index) => (
          <div key={index} className={styles.collaboratorItem}>
            <Link 
              href={`/programs/org/${collaborator.organization_acronym}`}
              className={styles.collaboratorLink}
            >
              <div className={styles.collaboratorInfo}>
                {collaborator.organization_logo && (
                  <div className={styles.collaboratorLogo}>
                    <Image 
                      src={collaborator.organization_logo} 
                      alt={`${collaborator.organization_name} logo`}
                      width={40} 
                      height={40}
                      className={styles.logoImage}
                      onError={(e) => {
                        e.target.src = '/assets/icons/placeholder.svg';
                      }}
                    />
                  </div>
                )}
                <div className={styles.collaboratorDetails}>
                  <div className={styles.collaboratorName}>
                    {collaborator.organization_name}
                  </div>
                  {collaborator.organization_acronym && (
                    <div className={styles.collaboratorAcronym}>
                      {collaborator.organization_acronym}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
