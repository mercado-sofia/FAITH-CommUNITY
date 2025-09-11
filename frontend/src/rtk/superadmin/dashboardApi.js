import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")
      
      // Add authentication token for superadmin endpoints
      if (typeof window !== 'undefined') {
        const superadminToken = localStorage.getItem('superAdminToken');
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

    // Get all organizations count
    getOrganizationsCount: builder.query({
      query: () => "/organizations",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const organizations = response.success ? response.data : response;
        return Array.isArray(organizations) ? organizations.length : 0;
      },
    }),

    // Get pending approvals count
    getPendingApprovalsCount: builder.query({
      query: () => "/approvals/pending",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const approvals = response.success ? response.data : response;
        return Array.isArray(approvals) ? approvals.length : 0;
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

    // Get organizations for dropdown filter
    getOrganizationsForFilter: builder.query({
      query: () => "/organizations",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const organizations = response.success ? response.data : response;
        if (!Array.isArray(organizations)) return [];
        
        // Return organizations directly as they're already formatted correctly
        return organizations.map(org => ({
          id: org.id,
          acronym: org.acronym,
          name: org.name
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
  useGetRecentPendingApprovalsQuery,
  useGetOrganizationsForFilterQuery,
} = dashboardApi
