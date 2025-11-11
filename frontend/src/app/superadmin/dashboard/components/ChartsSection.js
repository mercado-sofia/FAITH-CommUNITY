'use client';

import TopOrganizationsChart from './TopOrganizationsChart';
import ProgramCompletionTrendsChart from './ProgramCompletionTrendsChart';
import styles from './styles/ChartsSection.module.css';

export default function ChartsSection() {
  return (
    <div className={styles.chartsSection}>
      <div className={styles.chartWrapper}>
        <TopOrganizationsChart />
      </div>
      <div className={styles.chartWrapper}>
        <ProgramCompletionTrendsChart />
      </div>
    </div>
  );
}
