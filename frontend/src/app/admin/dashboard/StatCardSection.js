'use client';

import { useSelector } from 'react-redux';
import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { getProgramStatusByDates } from '@/utils/programStatusUtils';
import { useAdminVolunteers, useAdminPrograms } from '../hooks/useAdminData';
import { selectCurrentAdmin, selectIsAuthenticated } from '@/rtk/superadmin/adminSlice';

export default function StatCardSection() {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Fetch volunteers data for the current admin's organization using SWR
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading
  } = useAdminVolunteers(currentAdmin?.id);

  // Fetch programs data for the current admin's organization using SWR
  const { 
    programs: programsData = [], 
    isLoading: programsLoading
  } = useAdminPrograms();

  // Calculate counts from real data using getProgramStatusByDates to respect manual_status_override
  // This ensures consistency across all portals (Public, Admin, Superadmin)
  const activeProgramsCount = programsData.filter(program => {
    const programStatus = getProgramStatusByDates(program);
    return programStatus && programStatus.toLowerCase() === 'active';
  }).length;

  const upcomingProgramsCount = programsData.filter(program => {
    const programStatus = getProgramStatusByDates(program);
    return programStatus && programStatus.toLowerCase() === 'upcoming';
  }).length;

  const completedProgramsCount = programsData.filter(program => {
    const programStatus = getProgramStatusByDates(program);
    return programStatus && programStatus.toLowerCase() === 'completed';
  }).length;

  // Calculate total programs (active + upcoming)
  const totalProgramsCount = activeProgramsCount + upcomingProgramsCount;

  // Calculate percentage change for completed programs comparing last year
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;
  
  const completedThisYear = programsData.filter(program => {
    const programStatus = getProgramStatusByDates(program);
    if (programStatus && programStatus.toLowerCase() === 'completed') {
      const completedDate = program.date_completed || program.updated_at;
      if (completedDate) {
        const year = new Date(completedDate).getFullYear();
        return year === currentYear;
      }
    }
    return false;
  }).length;

  const completedPreviousYear = programsData.filter(program => {
    const programStatus = getProgramStatusByDates(program);
    if (programStatus && programStatus.toLowerCase() === 'completed') {
      const completedDate = program.date_completed || program.updated_at;
      if (completedDate) {
        const year = new Date(completedDate).getFullYear();
        return year === previousYear;
      }
    }
    return false;
  }).length;

  // Calculate percentage change
  let percentageChange = 0;
  if (completedPreviousYear > 0) {
    percentageChange = ((completedThisYear - completedPreviousYear) / completedPreviousYear) * 100;
  } else if (completedThisYear > 0) {
    // If previous year had 0, but current year has programs, it's 100% increase
    percentageChange = 100;
  }
  
  // Round to 1 decimal place
  percentageChange = Math.round(percentageChange * 10) / 10;

  // Calculate counts from real data
  const pendingApplications = volunteersData.filter(volunteer => 
    volunteer.status && volunteer.status.toLowerCase() === 'pending'
  );

  // Calculate unique users with pending applications
  const uniqueUsersWithPending = new Set(
    pendingApplications
      .filter(volunteer => volunteer.user_id)
      .map(volunteer => volunteer.user_id)
  ).size;

  const pendingUsersCount = uniqueUsersWithPending;
  const pendingApplicationsCount = pendingApplications.length;

  const approvedApplicationsCount = volunteersData.filter(volunteer => 
    volunteer.status && volunteer.status.toLowerCase() === 'approved'
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
          pendingCount={isLoading ? "—" : pendingUsersCount}
          showUsersLabel={true}
        />
      </Link>
      <Link href="/admin/volunteers" className={styles.cardWrapper}>
        <StatCard
          label="Total Applications"
          count={isLoading ? "—" : totalApplicationsCount}
          iconKey="total"
          isLoading={isLoading}
          pendingCount={isLoading ? "—" : pendingApplicationsCount}
          approvedCount={isLoading ? "—" : approvedApplicationsCount}
        />
      </Link>
      <Link href="/admin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Programs"
          count={isLoading ? "—" : totalProgramsCount}
          iconKey="programs"
          isLoading={isLoading}
          upcomingCount={isLoading ? "—" : upcomingProgramsCount}
          programsActiveCount={isLoading ? "—" : activeProgramsCount}
        />
      </Link>
      <Link href="/admin/programs?tab=completed" className={styles.cardWrapper}>
        <StatCard
          label="Completed Programs"
          count={isLoading ? "—" : completedProgramsCount}
          iconKey="programs"
          isLoading={isLoading}
          percentageChange={isLoading ? "—" : percentageChange}
        />
      </Link>
    </div>
  );
}