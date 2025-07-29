'use client';

import { useState, useEffect } from 'react';
import styles from '../programs.module.css';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function OrgLinks() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/organizations`);
        const data = await response.json();
        
        if (data.success && Array.isArray(data.data)) {
          setOrganizations(data.data);
          setError(null);
        } else {
          throw new Error(data.message || 'Failed to fetch organizations');
        }
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError(err.message);
        setOrganizations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  if (loading) {
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