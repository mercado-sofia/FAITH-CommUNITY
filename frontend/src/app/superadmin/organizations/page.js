'use client';

import { useState, useEffect } from 'react';
import styles from './organizations.module.css';

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    // Mock data
    setOrganizations([
      {
        id: 1,
        name: 'JPIA',
        description: 'Junior Philippine Institute of Accountants – nurturing future CPAs.',
        adviser: 'Ms. Dela Cruz',
      },
      {
        id: 2,
        name: 'CLIQUE',
        description: 'Community Leaders in ICT for Quality and Unity in Education.',
        adviser: 'Mr. Santos',
      },
      {
        id: 3,
        name: 'RiseUp',
        description: 'Rising leaders for youth empowerment and civic involvement.',
        adviser: 'Ms. Javier',
      },
    ]);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>Organization Management</h1>
        <button className={styles.addButton}>+ Add Organization</button>
      </div>

      <div className={styles.cardGrid}>
        {organizations.map((org) => (
          <div key={org.id} className={styles.card}>
            <h3>{org.name}</h3>
            <p>{org.description}</p>
            <small>Adviser: <strong>{org.adviser}</strong></small>
            <div className={styles.actions}>
              <button className={styles.editBtn}>Edit</button>
              <button className={styles.deleteBtn}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}