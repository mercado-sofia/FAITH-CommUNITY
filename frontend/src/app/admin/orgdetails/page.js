'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../styles/orgdetails.module.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';

export default function OrgDetailsAdminPage() {
  const orgId = 1; // This would be dynamic in a real app
  const [orgData, setOrgData] = useState({
    name: '',
    acronym: '',
    description: '',
    facebook: '',
    email: '',
    logo: ''
  });
  const [advocacies, setAdvocacies] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [heads, setHeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrgData = async () => {
    try {
      setLoading(true);
      // Fetch organization data
      const response = await fetch(`http://localhost:8080/api/organization/${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization data');
      }
      const data = await response.json();
      
      // Set organization data
      setOrgData({
        name: data.data.name || '',
        acronym: data.data.acronym || '',
        description: data.data.description || '',
        facebook: data.data.facebook || '',
        email: data.data.email || '',
        logo: data.data.logo || ''
      });

      // Fetch advocacies
      const advResponse = await fetch(`http://localhost:8080/api/organization/${orgId}/advocacies`);
      if (advResponse.ok) {
        const advData = await advResponse.json();
        setAdvocacies(advData.data || []);
      }

      // Fetch competencies
      const compResponse = await fetch(`http://localhost:8080/api/organization/${orgId}/competencies`);
      if (compResponse.ok) {
        const compData = await compResponse.json();
        setCompetencies(compData.data || []);
      }

      // Fetch organization heads
      const headsResponse = await fetch(`http://localhost:8080/api/organization/${orgId}/heads`);
      if (headsResponse.ok) {
        const headsData = await headsResponse.json();
        setHeads(headsData.data || []);
      }

      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error fetching organization data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();

    // Set up polling every 10 seconds to check for updates
    const interval = setInterval(fetchOrgData, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [orgId]);

  if (loading && !orgData.name) return <div className={styles.container}>Loading...</div>;
  if (error) return <div className={styles.container}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <div className={styles.headerSection}>
        <h2 className={styles.heading}>Organization</h2>
        <p className={styles.subheading}>
          Manage Your Organization’s Information and Profile.
        </p>
      </div>

      {/* Manage Link */}
      <div className={styles.headcard}>
        <p><strong>Org ID:</strong> {orgId}</p>
        <p><strong>Click below to manage your public page content.</strong></p>
        <Link href={`/admin/orgdetails/edit/${orgId}`} className={styles.editButton}>
          Edit Page Details
        </Link>
      </div>

      {/* Approved Content Display */}
      <div className={styles.card}>
        <h2 className={styles.sectionTitle}>Organization Information</h2>

        <div className={styles.infoGroup}>
          <div className={styles.orgRow}>
            <div className={styles.logoWrapper}>
              {orgData.logo ? (
                <img 
                  src={`http://localhost:8080/uploads/${orgData.logo}`} 
                  alt="Org Logo" 
                  className={styles.orgLogo}
                                    onError={(e) => {                    e.target.onerror = null;                    e.target.src = '/logo/faith_community_logo.png';                  }}
                />
              ) : (
                <img 
                  src="/images/placeholder-org.png"
                  alt="Default Org Logo"
                  className={styles.orgLogo}
                />
              )}
            </div>
            <div>
              <p className={styles.infoLabel}>Organization</p>
              <p className={styles.infoText_orgname}>
                {orgData.name} <span className={styles.acronym}>({orgData.acronym})</span>
              </p>

              {orgData.facebook && (
                <p className={styles.contactLink}>
                  <a href={orgData.facebook} target="_blank" rel="noopener noreferrer">
                    {orgData.facebook}
                  </a>
                </p>
              )}

              {orgData.email && (
                <p className={styles.contactEmail}>{orgData.email}</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.infoGroup}>
          <p className={styles.infoLabel}>Description</p>
          <p className={styles.infoText}>{orgData.description}</p>
        </div>

        <div className={styles.infoGroup}>
          <p className={styles.infoLabel}>Advocacies</p>
          <p className={styles.infoText}>
            {advocacies.map(item => item.advocacy).join(', ')}
          </p>
        </div>

        <div className={styles.infoGroup}>
          <p className={styles.infoLabel}>Competencies</p>
          <p className={styles.infoText}>
            {competencies.map(item => item.competency).join(', ')}
          </p>
        </div>

        {heads.length > 0 && (
          <div className={styles.infoGroup}>
            <p className={styles.infoLabel}>Organization Heads</p>
            <div className={styles.headsGrid}>
              {heads.map((head, index) => (
                <div key={index} className={styles.headCard}>
                  <div className={styles.headPhotoWrapper}>
                    {head.photo ? (
                      <img 
                        src={`http://localhost:8080/uploads/${head.photo}`} 
                        alt={head.name} 
                        className={styles.headPhoto}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/logo/faith_community_logo.png';
                        }}
                      />
                    ) : (
                      <img 
                        src="/logo/faith_community_logo.png"
                        alt="Default Head Photo"
                        className={styles.headPhoto}
                      />
                    )}
                  </div>
                  <div className={styles.headInfo}>
                    <p className={styles.headName}>{head.name}</p>
                    <p className={styles.headRole}>{head.role}</p>
                    {head.facebook && (
                      <a href={head.facebook} target="_blank" rel="noopener noreferrer" className={styles.headSocial}>
                        Facebook
                      </a>
                    )}
                    {head.email && (
                      <p className={styles.headEmail}>{head.email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
