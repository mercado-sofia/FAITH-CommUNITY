'use client';

import StatCard from './StatCard';
import styles from '../dashboard.module.css';
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
    <div className={styles.cardContainer}>
      <Link href="/superadmin/manageProfiles" className={styles.card}>
        <StatCard
          label="Total Organizations"
          count={isLoading ? "—" : organizationsCount}
          isLoading={organizationsLoading}
          iconKey="organizations"
        />
      </Link>
      <Link href="/superadmin/approvals" className={styles.card}>
        <StatCard
          label="Pending Approvals"
          count={isLoading ? "—" : pendingApprovalsCount}
          isLoading={pendingLoading}
          iconKey="pending"
        />
      </Link>
      <div className={styles.card}>
        <StatCard
          label="Upcoming Programs"
          count={isLoading ? "—" : upcomingProgramsCount}
          isLoading={upcomingProgramsLoading}
          iconKey="upcoming"
        />
      </div>
      <Link href="/superadmin/programs" className={styles.card}>
        <StatCard
          label="Active Programs & Services"
          count={isLoading ? "—" : activeProgramsCount}
          isLoading={programsLoading}
          iconKey="programs"
        />
      </Link>
    </div>
  );
}
