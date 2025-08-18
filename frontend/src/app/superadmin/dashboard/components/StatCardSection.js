'use client';

import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { 
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetTotalVolunteersCountQuery,
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
    data: totalVolunteersCount = 0, 
    isLoading: volunteersLoading 
  } = useGetTotalVolunteersCountQuery();

  const { 
    data: activeProgramsCount = 0, 
    isLoading: programsLoading 
  } = useGetActiveProgramsCountQuery();

  // Show loading state if any data is still loading
  const isLoading = organizationsLoading || pendingLoading || volunteersLoading || programsLoading;

  return (
    <div className={styles.cardGrid}>
      <Link href="/superadmin/manageProfiles" className={styles.cardWrapper}>
        <StatCard
          label="Total Organizations"
          count={isLoading ? "—" : organizationsCount}
          isLoading={organizationsLoading}
        />
      </Link>
      <Link href="/superadmin/approvals" className={styles.cardWrapper}>
        <StatCard
          label="Pending Approvals"
          count={isLoading ? "—" : pendingApprovalsCount}
          isLoading={pendingLoading}
        />
      </Link>
      <div className={styles.cardWrapper}>
        <StatCard
          label="Total Volunteers"
          count={isLoading ? "—" : totalVolunteersCount}
          isLoading={volunteersLoading}
        />
      </div>
      <Link href="/superadmin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Active Programs & Services"
          count={isLoading ? "—" : activeProgramsCount}
          isLoading={programsLoading}
        />
      </Link>
    </div>
  );
}
