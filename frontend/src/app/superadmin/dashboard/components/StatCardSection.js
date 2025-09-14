'use client';

import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { 
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetUpcomingProgramsCountQuery,
  useGetActiveProgramsCountQuery
} from '../../../../rtk/superadmin/dashboardApi';

export default function StatCardSection() {
  // Fetch dashboard statistics
  const { 
    data: organizationsCount = 0, 
    isLoading: organizationsLoading 
  } = useGetOrganizationsCountQuery();

  const { 
    data: pendingApprovalsCount = 0, 
    isLoading: pendingLoading 
  } = useGetPendingApprovalsCountQuery();

  const { 
    data: upcomingProgramsCount = 0, 
    isLoading: upcomingProgramsLoading 
  } = useGetUpcomingProgramsCountQuery();

  const { 
    data: activeProgramsCount = 0, 
    isLoading: programsLoading 
  } = useGetActiveProgramsCountQuery();

  // Show loading state if any data is still loading
  const isLoading = organizationsLoading || pendingLoading || upcomingProgramsLoading || programsLoading;

  return (
    <div className={styles.cardGrid}>
      <Link href="/superadmin/invites" className={styles.cardWrapper}>
        <StatCard
          label="Total Organizations"
          count={isLoading ? "—" : organizationsCount}
          isLoading={organizationsLoading}
          iconKey="organizations"
        />
      </Link>
      <Link href="/superadmin/approvals?status=pending" className={styles.cardWrapper}>
        <StatCard
          label="Pending Approvals"
          count={isLoading ? "—" : pendingApprovalsCount}
          isLoading={pendingLoading}
          iconKey="pending"
        />
      </Link>
      <Link href="/superadmin/programs?tab=upcoming" className={styles.cardWrapper}>
        <StatCard
          label="Upcoming Programs"
          count={isLoading ? "—" : upcomingProgramsCount}
          isLoading={upcomingProgramsLoading}
          iconKey="upcoming"
        />
      </Link>
      <Link href="/superadmin/programs?tab=active" className={styles.cardWrapper}>
        <StatCard
          label="Active Programs"
          count={isLoading ? "—" : activeProgramsCount}
          isLoading={programsLoading}
          iconKey="programs"
        />
      </Link>
    </div>
  );
}
