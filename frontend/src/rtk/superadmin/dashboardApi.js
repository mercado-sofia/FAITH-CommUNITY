import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api`,
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")
      
      // Add authentication token for superadmin endpoints
      if (typeof window !== 'undefined') {
        const superadminToken = localStorage.getItem('superAdminToken');
        // Send token to backend - let backend handle validation
        // Backend will reject hardcoded tokens in production with 403
        if (superadminToken) {
          headers.set('Authorization', `Bearer ${superadminToken}`);
        }
      }
      
      return headers
    },
  }),
  tagTypes: ["Dashboard"],
  endpoints: (builder) => ({
    // Get dashboard statistics
    getDashboardStats: builder.query({
      query: () => "/dashboard/stats",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        // Handle both direct response and wrapped response
        if (response.success) {
          return response.data;
        }
        return response;
      },
    }),

    // Get all organizations count with active/inactive breakdown
    getOrganizationsCount: builder.query({
      query: () => "/admins",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const admins = Array.isArray(response) ? response : [];
        
        // Group admins by organization_id and determine if org is active
        // An organization is active if at least one admin is active
        const orgStatusMap = new Map();
        
        admins.forEach(admin => {
          if (admin.organization_id) {
            const orgId = admin.organization_id;
            if (!orgStatusMap.has(orgId)) {
              orgStatusMap.set(orgId, false);
            }
            // If any admin for this org is active, mark org as active
            if (admin.is_active) {
              orgStatusMap.set(orgId, true);
            }
          }
        });
        
        const total = orgStatusMap.size;
        let active = 0;
        let inactive = 0;
        
        orgStatusMap.forEach((isActive) => {
          if (isActive) {
            active++;
          } else {
            inactive++;
          }
        });
        
        return {
          total,
          active,
          inactive
        };
      },
    }),

    // Get pending approvals count with unique organizations count
    getPendingApprovalsCount: builder.query({
      query: () => "/approvals/pending",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const approvals = response.success ? response.data : response;
        if (!Array.isArray(approvals)) {
          return {
            total: 0,
            organizationsCount: 0
          };
        }
        
        // Count unique organizations based on which organization submitted the approval
        // Use submitted_by_org_id to identify unique organizations that have pending approvals
        const uniqueOrganizations = new Set();
        
        approvals.forEach(approval => {
          // Use submitted_by_org_id (organization ID of the admin who submitted) to identify unique organizations
          if (approval.submitted_by_org_id) {
            uniqueOrganizations.add(approval.submitted_by_org_id);
          }
        });
        
        return {
          total: approvals.length,
          organizationsCount: uniqueOrganizations.size
        };
      },
    }),

    // Get upcoming programs count
    getUpcomingProgramsCount: builder.query({
      query: () => "/projects/superadmin/statistics",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        if (response.success && response.data) {
          return response.data.upcoming_programs || 0;
        }
        return 0;
      },
    }),

    // Get total programs count - disable this query for now since endpoint doesn't exist
    getTotalProgramsCount: builder.query({
      queryFn: () => ({ data: 0 }), // Return 0 for now until proper endpoint exists
      providesTags: ["Dashboard"],
    }),

    // Get active programs count
    getActiveProgramsCount: builder.query({
      query: () => "/projects/superadmin/statistics",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        if (response.success && response.data) {
          return response.data.active_programs || 0;
        }
        return 0;
      },
    }),

    // Get all programs statistics (upcoming, active, completed)
    getProgramsStatistics: builder.query({
      query: () => "/projects/superadmin/statistics",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        if (response.success && response.data) {
          const upcoming = parseInt(response.data.upcoming_programs) || 0;
          const active = parseInt(response.data.active_programs) || 0;
          const completed = parseInt(response.data.completed_programs) || 0;
          const total = upcoming + active;
          
          return {
            upcoming,
            active,
            completed,
            total,
            completedThisYear: parseInt(response.data.completed_this_year) || 0,
            completedPreviousYear: parseInt(response.data.completed_previous_year) || 0,
            percentageChange: parseFloat(response.data.percentage_change) || 0
          };
        }
        return {
          upcoming: 0,
          active: 0,
          completed: 0,
          total: 0,
          completedThisYear: 0,
          completedPreviousYear: 0,
          percentageChange: 0
        };
      },
    }),

    // Get program completion trends (time-series data for charts)
    getProgramCompletionTrends: builder.query({
      query: () => "/projects/superadmin/completion-trends",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        if (response.success && response.data) {
          return response.data || [];
        }
        return [];
      },
      transformErrorResponse: (response) => {
        // Handle errors gracefully - return empty array instead of error
        // This allows the component to show empty state instead of error message
        return [];
      },
    }),

    // Get top organizations by program count
    getTopOrganizationsByProgramCount: builder.query({
      query: (limit = 10) => `/projects/superadmin/top-organizations?limit=${limit}`,
      providesTags: ["Dashboard"],
      transformResponse: (response, meta, arg) => {
        // Log the raw response for debugging
        console.log('[getTopOrganizationsByProgramCount] Raw API response:', {
          response,
          responseType: typeof response,
          isArray: Array.isArray(response),
          hasSuccess: response?.success,
          hasData: !!response?.data,
          dataType: typeof response?.data,
          dataIsArray: Array.isArray(response?.data),
          dataLength: response?.data?.length
        });

        // Handle both direct data array and wrapped response
        if (Array.isArray(response)) {
          console.log('[getTopOrganizationsByProgramCount] Returning direct array, length:', response.length);
          return response;
        }
        if (response && response.success && response.data) {
          const data = Array.isArray(response.data) ? response.data : [];
          console.log('[getTopOrganizationsByProgramCount] Returning wrapped response data, length:', data.length);
          return data;
        }
        // Log unexpected response format
        console.warn('[getTopOrganizationsByProgramCount] Unexpected response format:', response);
        return [];
      },
      transformErrorResponse: (response, meta, arg) => {
        // Log errors for debugging (always log, not just in development)
        const errorData = {
          status: response?.status,
          statusText: response?.statusText,
          data: response?.data,
          error: response?.error,
          originalStatus: meta?.response?.status,
          originalStatusText: meta?.response?.statusText,
          url: meta?.request?.url,
          debug: response?.data?.debug || null
        };
        
        console.error('[getTopOrganizationsByProgramCount] API Error:', errorData);
        
        // Return error object with debug info preserved so frontend can display it
        // RTK Query will treat this as an error, but we preserve the debug data
        throw {
          status: response?.status || meta?.response?.status || 'FETCH_ERROR',
          data: response?.data || { message: 'Unknown error occurred', debug: null },
          error: response?.error || 'Failed to fetch top organizations'
        };
      },
    }),

    // Get recent pending approvals for table
    getRecentPendingApprovals: builder.query({
      query: () => "/approvals/pending",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const approvals = response.success ? response.data : response;
        if (!Array.isArray(approvals)) return [];
        
        // Sort by submission date and take first 5
        // Convert dates to strings to avoid serialization issues
        return approvals
          .map(approval => ({
            ...approval,
            submitted_at: approval.submitted_at ? new Date(approval.submitted_at).toISOString() : null,
            // Map backend fields to frontend expected fields
            organization_acronym: approval.org || approval.organization_acronym || 'N/A',
            organization_name: approval.orgName || approval.organization_name || 'Unknown Organization'
          }))
          .sort((a, b) => {
            const dateA = new Date(a.submitted_at || 0);
            const dateB = new Date(b.submitted_at || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
      },
    }),

    // Get recent approvals (all statuses) for table
    getRecentApprovals: builder.query({
      query: () => "/approvals",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const approvals = response.success ? response.data : response;
        if (!Array.isArray(approvals)) return [];
        
        // Sort by submission date and take first 5
        // Convert dates to strings to avoid serialization issues
        return approvals
          .map(approval => ({
            ...approval,
            submitted_at: approval.submitted_at ? new Date(approval.submitted_at).toISOString() : null,
            // Map backend fields to frontend expected fields
            organization_acronym: approval.org || approval.organization_acronym || 'N/A',
            organization_name: approval.orgName || approval.organization_name || 'Unknown Organization'
          }))
          .sort((a, b) => {
            const dateA = new Date(a.submitted_at || 0);
            const dateB = new Date(b.submitted_at || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
      },
    }),

    // Get organizations for dropdown filter
    getOrganizationsForFilter: builder.query({
      query: () => "/organizations",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const organizations = response.success ? response.data : response;
        if (!Array.isArray(organizations)) return [];
        
        // Filter to only include active organizations with valid data
        // Backend already filters by status='ACTIVE', but add extra validation here
        return organizations
          .filter(org => {
            // Ensure organization has required fields
            return org && 
                   org.id && 
                   org.acronym && 
                   org.acronym.trim() !== '' && 
                   org.name && 
                   org.name.trim() !== '';
          })
          .map(org => ({
            id: org.id,
            acronym: org.acronym,
            name: org.name,
            logo: org.logo || null,
            color: org.color || null
          }));
      },
    }),

  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetUpcomingProgramsCountQuery,
  useGetTotalProgramsCountQuery,
  useGetActiveProgramsCountQuery,
  useGetProgramsStatisticsQuery,
  useGetProgramCompletionTrendsQuery,
  useGetTopOrganizationsByProgramCountQuery,
  useGetRecentPendingApprovalsQuery,
  useGetRecentApprovalsQuery,
  useGetOrganizationsForFilterQuery,
} = dashboardApi
