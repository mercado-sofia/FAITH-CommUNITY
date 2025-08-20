'use client';

import { useSelector } from 'react-redux';
import { useEffect, useState, useMemo } from 'react';
import styles from './dashboard/styles/dashboard.module.css';
import StatCardSection from './dashboard/StatCardSection';
import RecentApplicationsTable from './dashboard/RecentApplicationsTable';
import { useAdminVolunteers } from '../../hooks/useAdminData';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../rtk/superadmin/adminSlice';
import SkeletonLoader from './components/SkeletonLoader';

// Track if dashboard has been visited
let hasVisitedDashboard = false;

export default function AdminIndexPage() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Memoized skeleton components to prevent unnecessary re-renders
  const DashboardSkeleton = useMemo(() => <SkeletonLoader type="dashboard" />, []);
  const TableSkeleton = useMemo(() => <SkeletonLoader type="table" count={5} />, []);

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

  // Debug logging
  console.log('Dashboard Debug:', {
    currentAdmin: currentAdmin?.id,
    volunteersLoading,
    volunteersDataLength: volunteersData.length,
    recentVolunteersLength: recentVolunteers.length,
    error: volunteersError
  });

  if (!isAuthenticated) {
    return null;
  }

  // Show skeleton loader while loading
  if (volunteersLoading) {
    return (
      <div className={styles.mainArea}>
        <div className={styles.header}>
          <h1>Dashboard</h1>
        </div>
        
        {DashboardSkeleton}
        
        <div className={styles.recentRow}>
          {TableSkeleton}
        </div>
      </div>
    );
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