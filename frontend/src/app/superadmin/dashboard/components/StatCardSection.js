'use client';

import StatCard from './StatCard';
import styles from './styles/StatCard.module.css';
import Link from 'next/link';
import { 
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetTotalVolunteersCountQuery,
  useGetTotalProgramsCountQuery
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
    data: totalProgramsCount = 0, 
    isLoading: programsLoading 
  } = useGetTotalProgramsCountQuery();

  // Show loading state if any data is still loading
  const isLoading = organizationsLoading || pendingLoading || volunteersLoading || programsLoading;

  return (
    <div className={styles.cardGrid}>
      <Link href="/superadmin/manageProfiles" className={styles.cardWrapper}>
        <StatCard
          label="Total Organizations"
          count={isLoading ? "—" : organizationsCount}
          iconKey="organizations"
          isLoading={organizationsLoading}
        />
      </Link>
      <Link href="/superadmin/approvals" className={styles.cardWrapper}>
        <StatCard
          label="Pending Approvals"
          count={isLoading ? "—" : pendingApprovalsCount}
          iconKey="pending"
          isLoading={pendingLoading}
        />
      </Link>
      <div className={styles.cardWrapper}>
        <StatCard
          label="Total Volunteers"
          count={isLoading ? "—" : totalVolunteersCount}
          iconKey="volunteers"
          isLoading={volunteersLoading}
        />
      </div>
      <Link href="/superadmin/programs" className={styles.cardWrapper}>
        <StatCard
          label="Programs & Services"
          count={isLoading ? "—" : totalProgramsCount}
          iconKey="programs"
          isLoading={programsLoading}
        />
      </Link>
    </div>
  );
}
