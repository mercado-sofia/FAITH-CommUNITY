'use client';

import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import RecentApplicationsTable from './components/RecentApplicationsTable';
import { useAdminVolunteers } from '../../../hooks/useAdminData';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice';

export default function AdminDashboard() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Fetch volunteers data for the current admin's organization using SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading,
    error: volunteersError
  } = useAdminVolunteers(currentAdmin?.id);

  // Get recent volunteers (most recent 5)
  const recentVolunteers = [...volunteersData]
    .sort((a, b) => {
      // Handle cases where date might be invalid or missing
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      
      // Check if dates are valid
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0; // Keep original order if dates are invalid
      }
      
      return dateB - dateA; // Most recent first
    })
    .slice(0, 5);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.mainArea}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
      </div>

      <StatCardSection />

      <div className={styles.recentRow}>
        <RecentApplicationsTable 
          volunteers={recentVolunteers}
          isLoading={volunteersLoading}
        />
      </div>
    </div>
  );
}