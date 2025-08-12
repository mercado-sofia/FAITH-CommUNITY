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
          // Debug: Log image data for each project
          response.data.forEach((project, index) => {
            console.log(`Project ${index + 1} image data:`, {
              id: project.id,
              title: project.title,
              hasImage: !!project.image,
              imageType: project.image ? (project.image.startsWith('data:') ? 'base64' : 'file') : 'none',
              imagePreview: project.image ? project.image.substring(0, 100) + '...' : null
            });
          });
          
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
            orgLogo: project.org_logo,
            orgColor: project.org_color
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
            programId: project.program_id,
            organizationId: project.organization_id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            completedDate: project.completed_date,
            createdAt: project.created_at,
            orgAcronym: project.org_acronym,
            orgName: project.org_name,
            orgLogo: project.org_logo,
            programTitle: project.program_title,
            programCategory: project.program_category,
            programImage: project.program_image
          }
        }
        return null
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - getFeaturedProjectById error:', response);
        return response;
      }
    }),

    // Add program to featured projects
    addFeaturedProject: builder.mutation({
      query: (programId) => ({
        url: `/superadmin/featured-projects`,
        method: 'POST',
        body: { programId }
      }),
      invalidatesTags: ["FeaturedProject"],
      transformResponse: (response) => {
        console.log('featuredProjectsApi - addFeaturedProject response:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - addFeaturedProject error:', response);
        return response;
      }
    }),

    // Remove program from featured projects
    removeFeaturedProject: builder.mutation({
      query: (programId) => ({
        url: `/superadmin/featured-projects/program/${programId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ["FeaturedProject"],
      transformResponse: (response) => {
        console.log('featuredProjectsApi - removeFeaturedProject response:', response);
        return response;
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - removeFeaturedProject error:', response);
        return response;
      }
    }),

    // Check if program is featured
    checkFeaturedStatus: builder.query({
      query: (programId) => `/superadmin/featured-projects/status/${programId}`,
      transformResponse: (response) => {
        console.log('featuredProjectsApi - checkFeaturedStatus response:', response);
        return response.success ? response.isFeatured : false;
      },
      transformErrorResponse: (response) => {
        console.error('featuredProjectsApi - checkFeaturedStatus error:', response);
        return response;
      }
    }),
  }),
})

export const {
  useGetAllFeaturedProjectsQuery,
  useGetFeaturedProjectByIdQuery,
  useAddFeaturedProjectMutation,
  useRemoveFeaturedProjectMutation,
  useCheckFeaturedStatusQuery,
} = featuredProjectsApi