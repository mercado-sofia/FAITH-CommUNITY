'use client';

import { useSelector } from 'react-redux';
import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { useAdminVolunteers, useAdminPrograms } from '../hooks/useAdminData';
import { selectCurrentAdmin, selectIsAuthenticated } from '@/rtk/superadmin/adminSlice';

export default function StatCardSection() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Fetch volunteers data for the current admin's organization using SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading,
    error: volunteersError
  } = useAdminVolunteers(currentAdmin?.id);

  // Fetch programs data for the current admin's organization using SWR
  const { 
    programs: programsData = [], 
    isLoading: programsLoading,
    error: programsError
  } = useAdminPrograms();

  // Calculate counts from real data
  const activeProgramsCount = programsData.filter(program => 
    program.status && program.status.toLowerCase() === 'active'
  ).length;

  const completedProgramsCount = programsData.filter(program => 
    program.status && program.status.toLowerCase() === 'completed'
  ).length;

  // Calculate counts from real data
  const pendingApplicationsCount = volunteersData.filter(volunteer => 
    volunteer.status && volunteer.status.toLowerCase() === 'pending'
  ).length;

  const totalApplicationsCount = volunteersData.length;

  // Show loading state if any data is still loading
  const isLoading = volunteersLoading || programsLoading;

  return (
    <div className={styles.cardGrid}>
      <Link href="/admin/volunteers?filter=pending" className={styles.cardWrapper}>
        <StatCard
          label="Pending Applications"
          count={isLoading ? "—" : pendingApplicationsCount}
          iconKey="pending"
          isLoading={isLoading}
        />
      </Link>
      <Link href="/admin/volunteers" className={styles.cardWrapper}>
        <StatCard
          label="Total Applications"
          count={isLoading ? "—" : totalApplicationsCount}
          iconKey="total"
          isLoading={isLoading}
        />
      </Link>
      <Link href="/admin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Active Programs"
          count={isLoading ? "—" : activeProgramsCount}
          iconKey="programs"
          isLoading={isLoading}
        />
      </Link>
      <Link href="/admin/programs?status=Completed" className={styles.cardWrapper}>
        <StatCard
          label="Completed Programs"
          count={isLoading ? "—" : completedProgramsCount}
          iconKey="programs"
          isLoading={isLoading}
        />
      </Link>
    </div>
  );
}