import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")
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
      query: () => "/admins",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const admins = response.success ? response.data : response;
        return Array.isArray(admins) ? admins.length : 0;
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

    // Get total volunteers count
    getTotalVolunteersCount: builder.query({
      query: () => "/volunteers",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const volunteers = response.success ? response.data : response;
        return Array.isArray(volunteers) ? volunteers.length : 0;
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
      query: () => "/admins",
      providesTags: ["Dashboard"],
      transformResponse: (response) => {
        const admins = response.success ? response.data : response;
        if (!Array.isArray(admins)) return [];
        
        // Extract unique organizations from admins data
        const uniqueOrgs = [];
        const seen = new Set();
        
        admins.forEach(admin => {
          const orgKey = `${admin.org}-${admin.orgName}`;
          if (!seen.has(orgKey) && admin.org && admin.orgName) {
            seen.add(orgKey);
            uniqueOrgs.push({
              id: admin.organization_id || admin.id,
              acronym: admin.org,
              name: admin.orgName
            });
          }
        });
        
        return uniqueOrgs;
      },
    }),
  }),
})

export const {
  useGetDashboardStatsQuery,
  useGetOrganizationsCountQuery,
  useGetPendingApprovalsCountQuery,
  useGetTotalVolunteersCountQuery,
  useGetTotalProgramsCountQuery,
  useGetActiveProgramsCountQuery,
  useGetRecentPendingApprovalsQuery,
  useGetOrganizationsForFilterQuery,
} = dashboardApi
