import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const organizationsApi = createApi({
  reducerPath: "organizationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api",
  }),
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
            logo: org.logo
          }))
        }
        return []
      },
    }),
  }),
})

export const {
  useGetAllOrganizationsQuery,
} = organizationsApi
