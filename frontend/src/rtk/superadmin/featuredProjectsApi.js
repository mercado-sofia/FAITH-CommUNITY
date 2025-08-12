import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const featuredProjectsApi = createApi({
  reducerPath: "featuredProjectsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for superadmin authentication
      const token = getState().superadmin?.token || localStorage.getItem("superadminToken")
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["FeaturedProject"],
  endpoints: (builder) => ({
    // Get all featured projects
    getAllFeaturedProjects: builder.query({
      query: () => `/superadmin/featured-projects`,
      providesTags: ["FeaturedProject"],
      transformResponse: (response) => {
        console.log('featuredProjectsApi - getAllFeaturedProjects response:', response);
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(project => ({
            id: project.id,
            organizationId: project.organization_id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            dateCreated: project.date_created,
            dateCompleted: project.date_completed,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            orgAcronym: project.org_acronym,
            orgName: project.org_name,
            orgLogo: project.org_logo
          }))
        }
        return []
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - getAllFeaturedProjects error:', response);
        return response;
      }
    }),

    // Get featured project by ID
    getFeaturedProjectById: builder.query({
      query: (id) => `/superadmin/featured-projects/${id}`,
      providesTags: (result, error, id) => [{ type: "FeaturedProject", id }],
      transformResponse: (response) => {
        console.log('featuredProjectsApi - getFeaturedProjectById response:', response);
        if (response.success && response.data) {
          const project = response.data;
          return {
            id: project.id,
            organizationId: project.organization_id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            dateCreated: project.date_created,
            dateCompleted: project.date_completed,
            createdAt: project.created_at,
            updatedAt: project.updated_at,
            orgAcronym: project.org_acronym,
            orgName: project.org_name,
            orgLogo: project.org_logo
          }
        }
        return null
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - getFeaturedProjectById error:', response);
        return response;
      }
    }),
  }),
})

export const {
  useGetAllFeaturedProjectsQuery,
  useGetFeaturedProjectByIdQuery,
} = featuredProjectsApi