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
            acronym: org.acronym, // This is the 'org' field from DB
            name: org.name, // This is the 'orgName' field from DB
            logo: org.logo,
            color: org.color || null // Organization color
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
