'use client';

import styles from '../programs.module.css';
import Link from 'next/link';

const orgList = [
  'JMAP', 'FACTS', 'JPIA', 'FAIEES', 'FAIIES',
  'IIEE-FSC', 'FTL', 'UTHYP', 'FAIPS',
  'FABCOMMS', 'FAICES', 'FAPSS', 'FAHSS', 
];

export default function OrgLinks() {
  return (
    <div className={styles.orgSection}>
      <span className={styles.orgLabel}>Organizations:</span>
      <div className={styles.orgList}>
        {orgList.map((org) => (
          <Link
            key={org}
            href={`/programs/org/${org.toLowerCase()}`}
            className={styles.orgItem}
          >
            {org}
          </Link>
        ))}
      </div>
    </div>
  );
}