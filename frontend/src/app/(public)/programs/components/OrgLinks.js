'use client';

import styles from '../programs.module.css';
import Link from 'next/link';

const orgList = [
  { acronym: 'JMAP', id: 'jmap' },
  { acronym: 'FACTS', id: 'facts' },
  { acronym: 'JPIA', id: 'jpia' },
  { acronym: 'FAIEES', id: 'faiees' },
  { acronym: 'FAIIES', id: 'faiies' },
  { acronym: 'IIEE-FSC', id: 'iiee-fsc' },
  { acronym: 'FTL', id: 'ftl' },
  { acronym: 'UTHYP', id: 'uthyp' },
  { acronym: 'FAIPS', id: 'faips' },
  { acronym: 'FABCOMMS', id: 'fabcomms' },
  { acronym: 'FAICES', id: 'faices' },
  { acronym: 'FAPSS', id: 'fapss' },
  { acronym: 'FAHSS', id: 'fahss' },
];

export default function OrgLinks() {
  return (
    <div className={styles.orgSection}>
      <span className={styles.orgLabel}>Organizations:</span>
      <div className={styles.orgList}>
        {orgList.map((org) => (
          <Link
            key={org.id}
            href={`/programs/org/${org.id}`}
            className={styles.orgItem}
          >
            {org.acronym}
          </Link>
        ))}
      </div>
    </div>
  );
}