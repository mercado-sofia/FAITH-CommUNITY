'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGetTopOrganizationsByProgramCountQuery } from '../../../../rtk/superadmin/dashboardApi';
import styles from './styles/TopOrganizationsChart.module.css';

export default function TopOrganizationsChart() {
  const { 
    data: organizationsData = [], 
    isLoading,
    isError
  } = useGetTopOrganizationsByProgramCountQuery(8); // Top 8 organizations

  // Transform data for chart - truncate long names
  const chartData = (organizationsData || [])
    .map(item => ({
      acronym: item.acronym || 'N/A',
      name: item.name || 'Unknown',
      displayName: (item.acronym || item.name || 'N/A').length > 12 
        ? `${(item.acronym || item.name || 'N/A').substring(0, 12)}...` 
        : (item.acronym || item.name || 'N/A'),
      programCount: parseInt(item.programCount) || 0
    }))
    .filter(item => item.programCount > 0)
    .sort((a, b) => b.programCount - a.programCount); // Sort by count descending

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const orgData = data.payload || {};
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{orgData.name || orgData.acronym || 'N/A'}</p>
          <p className={styles.tooltipValue}>
            Programs: <strong>{data.value}</strong> {data.value === 1 ? 'program' : 'programs'}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Top Organizations by Program Count</h3>
        </div>
        <div className={styles.loadingState}>
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Show error message only if there's an actual API error
  if (isError) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Top Organizations by Program Count</h3>
        </div>
        <div className={styles.emptyState}>
          <p>Failed to load chart data. Please try again later.</p>
        </div>
      </div>
    );
  }

  // Show empty state if API succeeded but returned no data (or data filtered to empty)
  if (!chartData || chartData.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Top Organizations by Program Count</h3>
        </div>
        <div className={styles.emptyState}>
          <p>No organization data available</p>
        </div>
      </div>
    );
  }

  // Calculate total programs and max value
  const totalPrograms = chartData.reduce((sum, item) => sum + item.programCount, 0);
  const maxValue = Math.max(...chartData.map(item => item.programCount), 1);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Top Organizations by Program Count</h3>
        <p className={styles.chartSubtitle}>Top {chartData.length} organizations • Total: {totalPrograms} programs</p>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number"
              stroke="#8b8e8d"
              fontSize={12}
              tick={{ fill: '#8b8e8d' }}
              allowDecimals={false}
              domain={[0, Math.ceil(maxValue * 1.1)]}
            />
            <YAxis 
              type="category"
              dataKey="displayName"
              stroke="#8b8e8d"
              fontSize={12}
              tick={{ fill: '#8b8e8d' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => (
                <span style={{ color: '#1d9782', fontSize: '13px' }}>
                  {value}
                </span>
              )}
            />
            <Bar 
              dataKey="programCount" 
              fill="#1d9782"
              name="Programs"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

