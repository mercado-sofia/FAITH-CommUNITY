'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGetProgramCompletionTrendsQuery } from '../../../../rtk/superadmin/dashboardApi';
import styles from './styles/ProgramCompletionTrendsChart.module.css';

export default function ProgramCompletionTrendsChart() {
  const { 
    data: trendsData = [], 
    isLoading,
    isError
  } = useGetProgramCompletionTrendsQuery();

  // Format month labels for better readability (e.g., "2024-01" -> "Jan 2024")
  const formatMonth = (monthString) => {
    if (!monthString) return '';
    const [year, month] = monthString.split('-');
    if (!year || !month) return monthString; // Return original if format is unexpected
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month) - 1;
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex >= 12) return monthString; // Return original if invalid
    return `${monthNames[monthIndex]} ${year}`;
  };

  // Transform data for chart - filter out invalid entries
  const chartData = (trendsData || [])
    .filter(item => item && item.month) // Filter out null/undefined items
    .map(item => ({
      month: item.month,
      monthLabel: formatMonth(item.month),
      completed: parseInt(item.count) || 0
    }))
    .filter(item => item.monthLabel); // Filter out items with invalid month format

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      if (!data || data.value === undefined) return null;
      
      // The label from Recharts is the formatted monthLabel (e.g., "Oct 2025")
      // If label is undefined, get it from the payload data
      const dataPoint = data.payload || {};
      let displayMonth = label;
      
      // If label is undefined or not formatted correctly, get from payload
      if (!displayMonth || displayMonth === 'undefined' || displayMonth === 'null') {
        displayMonth = dataPoint.monthLabel || formatMonth(dataPoint.month) || 'N/A';
      }
      
      return (
        <div className={styles.tooltip}>
          <p className={styles.tooltipLabel}>{displayMonth}</p>
          <p className={styles.tooltipValue}>
            Completed: <strong>{data.value}</strong> {data.value === 1 ? 'program' : 'programs'}
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
          <h3 className={styles.chartTitle}>Program Completion Trends</h3>
        </div>
        <div className={styles.loadingState}>
          <p>Loading chart data...</p>
        </div>
      </div>
    );
  }

  // Show empty state if API succeeded but returned no data
  // Also handle errors gracefully by showing empty state instead of error message
  if (isError || !chartData || chartData.length === 0) {
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Program Completion Trends</h3>
        </div>
        <div className={styles.emptyState}>
          <p>No completion data available for the last 12 months</p>
        </div>
      </div>
    );
  }

  // Calculate total completed
  const totalCompleted = chartData.reduce((sum, item) => sum + (item.completed || 0), 0);
  
  // Set Y-axis domain to handle edge cases
  const maxValue = Math.max(...chartData.map(item => item.completed || 0), 1);

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Program Completion Trends</h3>
        <p className={styles.chartSubtitle}>Last 12 months • Total: {totalCompleted} completed</p>
      </div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ 
              top: 5, 
              right: 20, 
              left: 0, 
              bottom: chartData.length > 6 ? 50 : 20 
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="monthLabel" 
              stroke="#8b8e8d"
              fontSize={12}
              tick={{ fill: '#8b8e8d' }}
              angle={chartData.length > 6 ? -45 : 0}
              textAnchor={chartData.length > 6 ? 'end' : 'middle'}
              height={chartData.length > 6 ? 60 : 30}
            />
            <YAxis 
              stroke="#8b8e8d"
              fontSize={12}
              tick={{ fill: '#8b8e8d' }}
              allowDecimals={false}
              domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.1) : 1]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              formatter={(value) => (
                <span style={{ color: '#1d9782', fontSize: '13px' }}>
                  {value}
                </span>
              )}
            />
            <Line 
              type="monotone" 
              dataKey="completed" 
              stroke="#1d9782" 
              strokeWidth={2}
              dot={{ fill: '#1d9782', r: 4 }}
              activeDot={{ r: 6 }}
              name="Completed Programs"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

