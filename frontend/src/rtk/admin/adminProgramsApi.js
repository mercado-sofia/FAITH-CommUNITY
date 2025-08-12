import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const adminProgramsApi = createApi({
  reducerPath: "adminProgramsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for admin authentication
      const token = getState().admin?.token || localStorage.getItem("adminToken")
      if (token && token !== "superadmin") {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["AdminProgram"],
  endpoints: (builder) => ({
    // Get programs by admin's organization
    getProgramsByAdminOrg: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "AdminProgram", id: orgId }],
      transformResponse: (response) => {
        console.log('adminProgramsApi - getProgramsByAdminOrg response:', response);
        // The backend returns the array directly, not wrapped in { data: ... }
        const programs = Array.isArray(response) ? response : []
        return programs.map(program => ({
          id: program.id,
          title: program.title,
          description: program.description,
          category: program.category,
          status: program.status,
          organization_id: program.organization_id,
          created_at: program.created_at,
          updated_at: program.updated_at
        }))
      },
      transformErrorResponse: (response) => {
        console.error('adminProgramsApi - getProgramsByAdminOrg error:', response);
        // Return empty array on error to prevent UI breaking
        return { data: [], error: response };
      }
    }),

    // Get active programs count by admin's organization
    getActiveProgramsCount: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "AdminProgram", id: orgId }],
      transformResponse: (response) => {
        console.log('adminProgramsApi - getActiveProgramsCount response:', response);
        // The backend returns the array directly, not wrapped in { data: ... }
        const programs = Array.isArray(response) ? response : []
        // Count only active programs (status === 'active' or similar)
        const activeCount = programs.filter(program => 
          program.status && program.status.toLowerCase() === 'active'
        ).length;
        console.log('adminProgramsApi - activeCount:', activeCount);
        return activeCount;
      },
      transformErrorResponse: (response) => {
        console.error('adminProgramsApi - getActiveProgramsCount error:', response);
        return response;
      }
    }),

    // Get completed programs count by admin's organization
    getCompletedProgramsCount: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "AdminProgram", id: orgId }],
      transformResponse: (response) => {
        console.log('adminProgramsApi - getCompletedProgramsCount response:', response);
        // The backend returns the array directly, not wrapped in { data: ... }
        const programs = Array.isArray(response) ? response : []
        // Count only completed programs (status === 'completed')
        const completedCount = programs.filter(program => 
          program.status && program.status.toLowerCase() === 'completed'
        ).length;
        console.log('adminProgramsApi - completedCount:', completedCount);
        return completedCount;
      },
      transformErrorResponse: (response) => {
        console.error('adminProgramsApi - getCompletedProgramsCount error:', response);
        return response;
      }
    }),
  }),
})

export const {
  useGetProgramsByAdminOrgQuery,
  useGetActiveProgramsCountQuery,
  useGetCompletedProgramsCountQuery,
} = adminProgramsApi
