'use client';

import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';
import StatCardSection from './components/StatCardSection';
import RecentApplicationsTable from './components/RecentApplicationsTable';
import { useAdminVolunteers } from '../../../hooks/useAdminData';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../rtk/superadmin/adminSlice';
import Loader from '../../../components/Loader';

// Track if dashboard has been visited
let hasVisitedDashboard = false;

export default function AdminDashboard() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [pageReady, setPageReady] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(!hasVisitedDashboard);

  // Fetch volunteers data for the current admin's organization using SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading
  } = useAdminVolunteers(currentAdmin?.id);

  // Smart loading logic
  useEffect(() => {
    if (!volunteersLoading) {
      const extraDelay = isFirstVisit ? 800 : 0; // Reduced delay for first visit
      const timer = setTimeout(() => {
        setPageReady(true);
        setIsFirstVisit(false);
        hasVisitedDashboard = true; // Mark as visited
      }, extraDelay);
      
      return () => clearTimeout(timer);
    }
  }, [volunteersLoading, isFirstVisit]);

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

  // Show loader only for first visits or when data is loading
  if (volunteersLoading || !pageReady) {
    return <Loader small centered />;
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