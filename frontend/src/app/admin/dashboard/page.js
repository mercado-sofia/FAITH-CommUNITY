'use client';

import { useSelector } from 'react-redux';
import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import RecentApplicationsTable from './components/RecentApplicationsTable';

import { useGetVolunteersByAdminOrgQuery } from '../../../rtk/admin/volunteersApi';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice';

export default function AdminDashboard() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Fetch volunteers data for the current admin's organization
  const { 
    data: volunteersData = [], 
    isLoading: volunteersLoading,
    error: volunteersError
  } = useGetVolunteersByAdminOrgQuery(currentAdmin?.id, {
    skip: !isAuthenticated || !currentAdmin?.id,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  });

  // Get recent volunteers (most recent 5)
  // Create a copy of the array before sorting to avoid mutating immutable RTK Query data
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