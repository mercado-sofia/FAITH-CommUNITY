'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGetTopOrganizationsByProgramCountQuery } from '../../../../rtk/superadmin/dashboardApi';
import styles from './styles/TopOrganizationsChart.module.css';

export default function TopOrganizationsChart() {
  const { 
    data: organizationsData = [], 
    isLoading,
    isError,
    error,
    isFetching,
    isSuccess
  } = useGetTopOrganizationsByProgramCountQuery(8); // Top 8 organizations

  // Extract debug info from error or response
  const debugInfo = error?.data?.debug || (organizationsData && typeof organizationsData === 'object' && 'debug' in organizationsData ? organizationsData.debug : null);
  
  // Debug logging - always log in development, and in production if there's an issue
  if (!isLoading && !isFetching) {
    if (isError) {
      console.error('[TopOrganizationsChart] Error fetching data:', {
        error,
        errorData: error?.data,
        errorStatus: error?.status,
        debugInfo
      });
    } else if (isSuccess) {
      console.log('[TopOrganizationsChart] API call successful. Data received:', {
        dataLength: organizationsData?.length || 0,
        data: organizationsData,
        isEmpty: !organizationsData || organizationsData.length === 0,
        debugInfo
      });
    }
  }

  // Transform data for chart - truncate long names
  // Handle both direct array and object with data property
  const rawData = Array.isArray(organizationsData) 
    ? organizationsData 
    : (organizationsData?.data || []);
    
  const chartData = (rawData || [])
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

  // Show empty state if API succeeded but returned no data (or data filtered to empty)
  // Also handle errors gracefully by showing exact error details
  if (isError || !chartData || chartData.length === 0) {
    // Extract exact error message from various possible locations
    let exactErrorMessage = null;
    let errorDetails = null;
    
    if (isError) {
      // Try multiple locations for error message - prioritize the most specific one
      exactErrorMessage = 
        error?.data?.error || 
        error?.data?.message || 
        error?.message || 
        error?.error ||
        (typeof error === 'string' ? error : null) ||
        'Failed to load data';
      
      // Get full error details including SQL errors if available
      errorDetails = {
        status: error?.status || error?.data?.status,
        statusText: error?.statusText,
        error: error?.data?.error,
        message: error?.data?.message,
        errorDetails: error?.data?.errorDetails,
        stack: error?.stack,
        fullError: error
      };
    }
    
    const hasDebugInfo = !!debugInfo;
    const hasDiagnosticData = isError && error?.data?.debug?.diagnosticData;
    
    return (
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>Top Organizations by Program Count</h3>
        </div>
        <div className={styles.emptyState}>
          {isError && exactErrorMessage && (
            <div style={{ 
              marginBottom: '15px', 
              padding: '12px', 
              background: '#fee', 
              border: '1px solid #fcc',
              borderRadius: '4px',
              color: '#c33'
            }}>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                ⚠️ Error: {exactErrorMessage}
              </p>
              {errorDetails?.status && (
                <p style={{ margin: '4px 0', fontSize: '12px', color: '#a33' }}>
                  <strong>Status:</strong> {errorDetails.status} {errorDetails.statusText ? `(${errorDetails.statusText})` : ''}
                </p>
              )}
              {errorDetails?.errorDetails && (
                <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '3px', fontSize: '12px' }}>
                  {errorDetails.errorDetails.type && (
                    <p style={{ margin: '2px 0' }}><strong>Error Type:</strong> {errorDetails.errorDetails.type}</p>
                  )}
                  {errorDetails.errorDetails.code && (
                    <p style={{ margin: '2px 0' }}><strong>Error Code:</strong> {errorDetails.errorDetails.code}</p>
                  )}
                  {errorDetails.errorDetails.sqlMessage && (
                    <p style={{ margin: '2px 0', color: '#d00' }}><strong>SQL Error:</strong> {errorDetails.errorDetails.sqlMessage}</p>
                  )}
                  {errorDetails.errorDetails.sqlState && (
                    <p style={{ margin: '2px 0' }}><strong>SQL State:</strong> {errorDetails.errorDetails.sqlState}</p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {!isError && (
            <p style={{ marginBottom: '15px' }}>No organization data available</p>
          )}
          
          {hasDiagnosticData && (
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: '#f9f9f9', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '13px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Database Diagnostics:</p>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                <li><strong>Total Programs:</strong> {error.data.debug.diagnosticData.totalPrograms || 0}</li>
                <li><strong>Total Organizations:</strong> {error.data.debug.diagnosticData.totalOrganizations || 0}</li>
                <li><strong>Active Organizations:</strong> {error.data.debug.diagnosticData.activeOrganizations || 0}</li>
                <li><strong>Active Orgs with Programs:</strong> {error.data.debug.diagnosticData.activeOrgsWithPrograms || 0}</li>
              </ul>
              {error.data.debug.diagnosticData.samplePrograms && error.data.debug.diagnosticData.samplePrograms.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Sample Programs:</p>
                  <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
                    {error.data.debug.diagnosticData.samplePrograms.map((prog, idx) => (
                      <li key={idx}>
                        ID: {prog.id}, Org ID: {prog.organization_id}, Org Status: {prog.org_status || 'N/A'}, 
                        Org: {prog.org || 'N/A'}, Title: {prog.title || 'N/A'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {hasDebugInfo && (
            <details style={{ marginTop: '15px', fontSize: '12px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                textDecoration: 'underline',
                fontWeight: 'bold',
                color: '#666'
              }}>
                Full Debug Information
              </summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px', 
                background: '#f5f5f5', 
                border: '1px solid #ddd',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
          
          {errorDetails && Object.keys(errorDetails).length > 0 && (
            <details style={{ marginTop: '15px', fontSize: '12px' }}>
              <summary style={{ 
                cursor: 'pointer', 
                textDecoration: 'underline',
                fontWeight: 'bold',
                color: '#666'
              }}>
                Error Details
              </summary>
              <pre style={{ 
                marginTop: '10px', 
                padding: '10px', 
                background: '#fff5f5', 
                border: '1px solid #fcc',
                borderRadius: '4px',
                overflow: 'auto',
                maxHeight: '300px',
                fontSize: '11px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(errorDetails, null, 2)}
              </pre>
            </details>
          )}
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

