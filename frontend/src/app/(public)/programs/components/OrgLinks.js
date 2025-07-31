'use client';

import styles from '../programs.module.css';
import Link from 'next/link';
import { usePublicOrganizations } from '../../../../hooks/usePublicData';

export default function OrgLinks() {
  const { organizations, isLoading, error } = usePublicOrganizations();

  if (isLoading) {
    return (
      <div className={styles.orgSection}>
        <span className={styles.orgLabel}>Organizations:</span>
        <div className={styles.orgList}>
          <span className={styles.loadingText}>Loading organizations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.orgSection}>
        <span className={styles.orgLabel}>Organizations:</span>
        <div className={styles.orgList}>
          <span className={styles.errorText}>Unable to load organizations</span>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className={styles.orgSection}>
        <span className={styles.orgLabel}>Organizations:</span>
        <div className={styles.orgList}>
          <span className={styles.emptyText}>No organizations available</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.orgSection}>
      <span className={styles.orgLabel}>Organizations:</span>
      <div className={styles.orgList}>
        {organizations.map((org) => (
          <Link
            key={org.id}
            href={`/programs/org/${org.id}`}
            className={styles.orgItem}
            title={org.name || org.acronym}
          >
            {org.acronym}
          </Link>
        ))}
      </div>
    </div>
  );
}