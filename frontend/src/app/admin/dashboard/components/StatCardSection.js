'use client';

import { useSelector } from 'react-redux';
import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { useGetVolunteersByAdminOrgQuery } from '../../../../rtk/admin/volunteersApi';
import { useGetActiveProgramsCountQuery, useGetCompletedProgramsCountQuery } from '../../../../rtk/admin/adminProgramsApi';
import { selectCurrentAdmin, selectIsAuthenticated } from '../../../../rtk/superadmin/adminSlice';

export default function StatCardSection() {
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

  // Fetch active programs count for the current admin's organization
  // Use organization acronym (org) for programs API as backend expects org identifier
  const { 
    data: activeProgramsCount = 0, 
    isLoading: activeProgramsLoading,
    error: activeProgramsError
  } = useGetActiveProgramsCountQuery(currentAdmin?.org, {
    skip: !isAuthenticated || !currentAdmin?.org,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  });

  // Fetch completed programs count for the current admin's organization
  const { 
    data: completedProgramsCount = 0, 
    isLoading: completedProgramsLoading,
    error: completedProgramsError
  } = useGetCompletedProgramsCountQuery(currentAdmin?.org, {
    skip: !isAuthenticated || !currentAdmin?.org,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true
  });



  // Calculate counts from real data
  const pendingApplicationsCount = volunteersData.filter(volunteer => 
    volunteer.status && volunteer.status.toLowerCase() === 'pending'
  ).length;

  const totalApplicationsCount = volunteersData.length;

  // Show loading state if any data is still loading
  const isLoading = volunteersLoading || activeProgramsLoading || completedProgramsLoading;

  // Show error state if there are errors
  if (volunteersError || activeProgramsError || completedProgramsError) {
    // Handle errors silently in production
  }

  return (
    <div className={styles.cardGrid}>
      <Link href="/admin/volunteers?filter=pending" className={styles.cardWrapper}>
        <StatCard
          label="Pending Applications"
          count={isLoading ? "..." : pendingApplicationsCount}
          iconKey="pending"
        />
      </Link>
      <Link href="/admin/volunteers" className={styles.cardWrapper}>
        <StatCard
          label="Total Applications"
          count={isLoading ? "..." : totalApplicationsCount}
          iconKey="total"
        />
      </Link>
      <Link href="/admin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Active Programs"
          count={isLoading ? "..." : activeProgramsCount}
          iconKey="programs"
        />
      </Link>
      <Link href="/admin/programs?status=Completed" className={styles.cardWrapper}>
        <StatCard
          label="Completed Programs"
          count={isLoading ? "..." : completedProgramsCount}
          iconKey="programs"
        />
      </Link>
    </div>
  );
}