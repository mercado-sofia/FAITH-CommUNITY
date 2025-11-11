'use client';

import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { 
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetProgramsStatisticsQuery
} from '../../../../rtk/superadmin/dashboardApi';

export default function StatCardSection() {
  // Fetch dashboard statistics
  const { 
    data: organizationsData = { total: 0, active: 0, inactive: 0 }, 
    isLoading: organizationsLoading 
  } = useGetOrganizationsCountQuery();
  
  const organizationsCount = organizationsData.total || 0;
  const activeCount = organizationsData.active || 0;
  const inactiveCount = organizationsData.inactive || 0;

  const { 
    data: pendingApprovalsData = { total: 0, organizationsCount: 0 }, 
    isLoading: pendingLoading 
  } = useGetPendingApprovalsCountQuery();
  
  const pendingApprovalsCount = pendingApprovalsData.total || 0;
  const pendingOrganizationsCount = pendingApprovalsData.organizationsCount || 0;

  const { 
    data: programsData = { upcoming: 0, active: 0, completed: 0, total: 0, completedThisYear: 0, percentageChange: 0 }, 
    isLoading: programsLoading 
  } = useGetProgramsStatisticsQuery();
  
  const programsTotal = programsData.total || 0;
  const upcomingCount = programsData.upcoming || 0;
  const programsActiveCount = programsData.active || 0;
  const completedCount = programsData.completedThisYear || 0;
  const percentageChange = programsData.percentageChange || 0;

  // Show loading state if any data is still loading
  const isLoading = organizationsLoading || pendingLoading || programsLoading;

  return (
    <div className={styles.cardGrid}>
      <Link href="/superadmin/invites" className={styles.cardWrapper}>
        <StatCard
          label="Total Organizations"
          count={isLoading ? "—" : organizationsCount}
          isLoading={organizationsLoading}
          iconKey="organizations"
          activeCount={isLoading ? "—" : activeCount}
          inactiveCount={isLoading ? "—" : inactiveCount}
        />
      </Link>
      <Link href="/superadmin/approvals?status=pending" className={styles.cardWrapper}>
        <StatCard
          label="Pending Approvals"
          count={isLoading ? "—" : pendingApprovalsCount}
          isLoading={pendingLoading}
          iconKey="pending"
          organizationsCount={isLoading ? "—" : pendingOrganizationsCount}
        />
      </Link>
      <Link href="/superadmin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Programs"
          count={isLoading ? "—" : programsTotal}
          isLoading={programsLoading}
          iconKey="programs"
          upcomingCount={isLoading ? "—" : upcomingCount}
          programsActiveCount={isLoading ? "—" : programsActiveCount}
        />
      </Link>
      <Link href="/superadmin/programs?tab=completed" className={styles.cardWrapper}>
        <StatCard
          label="Completed Programs"
          count={isLoading ? "—" : completedCount}
          isLoading={programsLoading}
          iconKey="programs"
          percentageChange={isLoading ? "—" : percentageChange}
        />
      </Link>
    </div>
  );
}
