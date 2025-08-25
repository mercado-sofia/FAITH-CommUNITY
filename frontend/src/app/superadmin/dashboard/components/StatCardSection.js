'use client';

import StatCard from './StatCard';
import styles from '../dashboard.module.css';
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
          label="Total Volunteers"
          count={isLoading ? "—" : totalVolunteersCount}
          isLoading={volunteersLoading}
          iconKey="volunteers"
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
