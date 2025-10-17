import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const programsApi = createApi({
  reducerPath: "programsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api",
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      return headers
    },
  }),
  tagTypes: ["Program"],
  endpoints: (builder) => ({
    // Get all approved programs with status "Upcoming" for public display
    getApprovedUpcomingPrograms: builder.query({
      query: () => "/programs/approved/upcoming",
      providesTags: ["Program"],
      transformResponse: (response) => {
        // Ensure we return an array and transform the data to match expected format
        const programs = Array.isArray(response) ? response : response?.data || []
        return programs.map(program => ({
          id: program.id || program._id,
          name: program.title || program.name,
          org: program.organization || program.org,
          description: program.description,
          category: program.category,
          status: program.status
        }))
      },
    }),

    // Get all programs (for admin use)
    getAllPrograms: builder.query({
      query: () => "/programs",
      providesTags: ["Program"],
    }),

    // Get programs by organization
    getProgramsByOrganization: builder.query({
      query: (orgId) => `/admin/programs/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "Program", id: orgId }],
    }),

    // Get featured programs for public display (consolidated from featuredProjectsApi)
    getPublicFeaturedProjects: builder.query({
      query: () => '/programs/featured',
      providesTags: ['Program'],
      transformResponse: (response) => {
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            eventStartDate: project.event_start_date,
            eventEndDate: project.event_end_date,
            orgAcronym: project.orgAcronym,
            orgName: project.orgName,
            orgColor: project.orgColor,
            category: project.category,
            created_at: project.created_at,
            slug: project.slug,
            is_collaborative: project.is_collaborative,
            collaborators: project.collaborators
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
  useGetApprovedUpcomingProgramsQuery,
  useGetAllProgramsQuery,
  useGetProgramsByOrganizationQuery,
  useGetPublicFeaturedProjectsQuery,
} = programsApi
