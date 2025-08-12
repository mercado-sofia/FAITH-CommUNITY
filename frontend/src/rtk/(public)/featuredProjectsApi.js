import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const publicFeaturedProjectsApi = createApi({
  reducerPath: 'publicFeaturedProjectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:8080/api',
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['PublicFeaturedProject'],
  endpoints: (builder) => ({
    // Get all featured projects for public display
    getPublicFeaturedProjects: builder.query({
      query: () => '/superadmin/featured-projects',
      providesTags: ['PublicFeaturedProject'],
      transformResponse: (response) => {
        console.log('publicFeaturedProjectsApi - getPublicFeaturedProjects response:', response);
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(project => ({
            id: project.id,
            programId: project.program_id,
            organizationId: project.organization_id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            completedDate: project.completed_date,
            orgAcronym: project.org_acronym,
            orgName: project.org_name,
            orgLogo: project.org_logo,
            orgColor: project.org_color,
            programTitle: project.program_title,
            programCategory: project.program_category,
            programImage: project.program_image
          }))
        }
        return []
      },
      transformErrorResponse: (response) => {
        console.error('publicFeaturedProjectsApi - getPublicFeaturedProjects error:', response);
        return response;
      }
    }),
  }),
})

export const {
  useGetPublicFeaturedProjectsQuery,
} = publicFeaturedProjectsApi
