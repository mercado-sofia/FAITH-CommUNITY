import { createApi } from "@reduxjs/toolkit/query/react"
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const organizationsApi = createApi({
  reducerPath: "organizationsApi",
  baseQuery: createBaseQuery('/api', false),
  tagTypes: ["Organizations"],
  endpoints: (builder) => ({
    // Get all organizations for public use
    getAllOrganizations: builder.query({
      query: () => `/organizations`,
      providesTags: ["Organizations"],
      transformResponse: (response) => {
        // The backend returns { success: true, data: [...] }
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(org => ({
            id: org.id,
            acronym: org.acronym || org.org,
            name: org.name || org.orgName,
            logo: org.logo,
            color: org.color || org.org_color || null,
          }))
        }
        return []
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),
  }),
})

export const {
  useGetAllOrganizationsQuery,
} = organizationsApi
