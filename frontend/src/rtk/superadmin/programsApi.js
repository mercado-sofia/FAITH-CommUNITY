import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { getProgramStatusByDates } from "@/utils/programStatusUtils"
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api` : '/api';
};

export const superadminProgramsApi = createApi({
  reducerPath: "superadminProgramsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers
    },
  }),
  tagTypes: ["SuperadminProgram"],
  endpoints: (builder) => ({
    // Get all programs grouped by organization
    getAllProgramsByOrganization: builder.query({
      query: () => `/program-projects/superadmin/all`,
      providesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        if (response.success && Array.isArray(response.data)) {
          // Group programs by organization
          const groupedPrograms = response.data.reduce((acc, program) => {
            const orgKey = program.organization_id;
            if (!acc[orgKey]) {
              acc[orgKey] = {
                organizationId: program.organization_id,
                organizationName: program.organization_name,
                organizationAcronym: program.organization_acronym,
                orgLogo: program.orgLogo,
                organizationColor: program.organization_color,
                programs: {
                  upcoming: [],
                  active: [],
                  completed: []
                }
              };
            }

            const programData = {
              id: program.id,
              title: program.title,
              description: program.description,
              category: program.category,
              status: program.status,
              image: program.image,
              event_start_date: program.event_start_date,
              event_end_date: program.event_end_date,
              multiple_dates: program.multiple_dates || [],
              created_at: program.created_at,
              updated_at: program.updated_at,
              // Preserve is_collaborative from backend (already converted to boolean)
              is_collaborative: program.is_collaborative === true || program.is_collaborative === 1 || program.is_collaborative === '1' || Boolean(program.is_collaborative),
              collaborators: program.collaborators || [],
              organization_name: program.organization_name,
              organization_acronym: program.organization_acronym,
              organization_color: program.organization_color,
              submitted_by_name: program.submitted_by_name,
              submitted_by_role: program.submitted_by_role,
              edited_by_name: program.edited_by_name,
              edited_by_role: program.edited_by_role,
              manual_status_override: program.manual_status_override === true || program.manual_status_override === 1 || program.manual_status_override === '1',
              accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true
            };

            // Categorize by status using getProgramStatusByDates to respect manual_status_override
            // This ensures consistency across all portals (Public, Admin, Superadmin)
            const calculatedStatus = getProgramStatusByDates(programData);
            if (calculatedStatus === 'Upcoming') {
              acc[orgKey].programs.upcoming.push(programData);
            } else if (calculatedStatus === 'Active') {
              acc[orgKey].programs.active.push(programData);
            } else if (calculatedStatus === 'Completed') {
              acc[orgKey].programs.completed.push(programData);
            }

            return acc;
          }, {});

          return Object.values(groupedPrograms);
        }
        return []
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Get programs statistics
    getProgramsStatistics: builder.query({
      query: () => `/program-projects/superadmin/statistics`,
      providesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        if (response.success && response.data) {
          return {
            totalPrograms: response.data.total_programs || 0,
            upcomingPrograms: response.data.upcoming_programs || 0,
            activePrograms: response.data.active_programs || 0,
            completedPrograms: response.data.completed_programs || 0,
            totalOrganizations: response.data.total_organizations || 0
          };
        }
        return {
          totalPrograms: 0,
          upcomingPrograms: 0,
          activePrograms: 0,
          completedPrograms: 0,
          totalOrganizations: 0
        };
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Get individual program by ID with complete details
    getProgramById: builder.query({
      query: (id) => `/projects/superadmin/${id}`,
      providesTags: (result, error, id) => [{ type: "SuperadminProgram", id }],
      transformResponse: (response) => {
        if (response.success && response.data) {
          const program = response.data;
          return {
            id: program.id,
            title: program.title,
            description: program.description,
            category: program.category,
            status: program.status,
            image: program.image,
            event_start_date: program.event_start_date,
            event_end_date: program.event_end_date,
            multiple_dates: program.multiple_dates || [],
            additional_images: program.additional_images || [],
            created_at: program.created_at,
            updated_at: program.updated_at,
            organization_id: program.organization_id,
            organization_name: program.organization_name,
            organization_acronym: program.organization_acronym,
            orgLogo: program.orgLogo,
            is_collaborative: program.is_collaborative || false,
            collaborators: program.collaborators || [],
            submitted_by_name: program.submitted_by_name,
            submitted_by_role: program.submitted_by_role,
            edited_by_name: program.edited_by_name,
            edited_by_role: program.edited_by_role
          };
        }
        return null;
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Get all featured programs (consolidated from featuredProjectsApi)
    getAllFeaturedProjects: builder.query({
      query: () => `/superadmin/featured-projects`,
      providesTags: ["SuperadminProgram"],
      keepUnusedDataFor: 60,
      transformResponse: (response) => {
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(project => ({
            id: project.id,
            title: project.title,
            description: project.description,
            image: project.image,
            status: project.status,
            event_start_date: project.event_start_date,
            event_end_date: project.event_end_date,
            created_at: project.created_at,
            orgAcronym: project.orgAcronym,
            orgName: project.orgName,
            orgColor: project.orgColor,
            category: project.category,
            slug: project.slug,
            is_collaborative: project.is_collaborative || false,
            collaborators: project.collaborators || []
          }))
        }
        return []
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Add program to featured projects
    addFeaturedProject: builder.mutation({
      query: (programId) => ({
        url: `/superadmin/programs/${programId}/featured`,
        method: 'PUT',
        body: { isFeatured: true }
      }),
      invalidatesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        return response;
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Remove program from featured projects
    removeFeaturedProject: builder.mutation({
      query: (programId) => ({
        url: `/superadmin/programs/${programId}/featured`,
        method: 'PUT',
        body: { isFeatured: false }
      }),
      invalidatesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        return response;
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Check if program is featured
    checkFeaturedStatus: builder.query({
      query: (programId) => `/admin/programs/single/${programId}`,
      transformResponse: (response) => {
        return response.success ? response.data.is_featured : false;
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),
  }),
})

export const {
  useGetAllProgramsByOrganizationQuery,
  useGetProgramsStatisticsQuery,
  useGetProgramByIdQuery,
  useGetAllFeaturedProjectsQuery,
  useAddFeaturedProjectMutation,
  useRemoveFeaturedProjectMutation,
  useCheckFeaturedStatusQuery,
} = superadminProgramsApi
