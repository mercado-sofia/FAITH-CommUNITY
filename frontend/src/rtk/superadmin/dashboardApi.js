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
            // Ensure organization name is properly displayed
            organization_name: approval.organization_name || approval.organization_acronym || approval.admin_name || 'Unknown Organization'
          }))
          .sort((a, b) => {
            const dateA = new Date(a.submitted_at || 0);
            const dateB = new Date(b.submitted_at || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
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
  useGetRecentPendingApprovalsQuery,
} = dashboardApi
