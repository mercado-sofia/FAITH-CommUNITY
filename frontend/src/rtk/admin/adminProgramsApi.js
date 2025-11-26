import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { getProgramStatusByDates } from "@/utils/shared/programStatusUtils"
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api` : '/api';
};

export const adminProgramsApi = createApi({
  reducerPath: "adminProgramsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      // No Authorization header needed - httpOnly cookies handle authentication
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
        // Return empty array on error to prevent UI breaking
        return { data: [], error: response };
      }
    }),

    // Get active programs count by admin's organization
    getActiveProgramsCount: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "AdminProgram", id: orgId }],
      transformResponse: (response) => {
        // The backend returns the array directly, not wrapped in { data: ... }
        const programs = Array.isArray(response) ? response : []
        // Count only active programs using getProgramStatusByDates to respect manual_status_override
        const activeCount = programs.filter(program => {
          const programStatus = getProgramStatusByDates(program);
          return programStatus && programStatus.toLowerCase() === 'active';
        }).length;
        return activeCount;
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Get completed programs count by admin's organization
    getCompletedProgramsCount: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "AdminProgram", id: orgId }],
      transformResponse: (response) => {
        // The backend returns the array directly, not wrapped in { data: ... }
        const programs = Array.isArray(response) ? response : []
        // Count only completed programs using getProgramStatusByDates to respect manual_status_override
        const completedCount = programs.filter(program => {
          const programStatus = getProgramStatusByDates(program);
          return programStatus && programStatus.toLowerCase() === 'completed';
        }).length;
        return completedCount;
      },
      transformErrorResponse: (response) => {
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
