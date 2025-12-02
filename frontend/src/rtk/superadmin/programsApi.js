import { createApi } from "@reduxjs/toolkit/query/react"
import { getProgramStatusByDates } from "@/utils/shared/programStatusUtils"
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const superadminProgramsApi = createApi({
  reducerPath: "superadminProgramsApi",
  baseQuery: createBaseQuery('/api', false),
  tagTypes: ["SuperadminProgram", "FeaturedStatus"],
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

            // Skip archived programs - they should only appear in the archive page
            if (program.status === 'archived') {
              return acc;
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
            archivedPrograms: response.data.archived_programs || 0,
            featuredPrograms: response.data.featured_programs || 0,
            totalOrganizations: response.data.total_organizations || 0
          };
        }
        return {
          totalPrograms: 0,
          upcomingPrograms: 0,
          activePrograms: 0,
          completedPrograms: 0,
          archivedPrograms: 0,
          featuredPrograms: 0,
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
          // Filter out archived programs - they should only appear in the archive page
          return response.data
            .filter(project => project.status !== 'archived')
            .map(project => ({
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
      providesTags: (result, error, programId) => [
        { type: "SuperadminProgram", id: programId },
        { type: "FeaturedStatus", id: programId }
      ],
      transformResponse: (response) => {
        if (!response.success || !response.data) {
          return false;
        }
        // If program is archived, it cannot be featured
        if (response.data.status === 'archived') {
          return false;
        }
        // Return the actual featured status for non-archived programs
        return response.data.is_featured === true || response.data.is_featured === 1 || response.data.is_featured === '1';
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),

    // Archive a program
    archiveProgram: builder.mutation({
      query: (programId) => ({
        url: `/admin/programs/${programId}/archive`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, programId) => [
        "SuperadminProgram",
        { type: "SuperadminProgram", id: programId },
        { type: "FeaturedStatus", id: programId }
      ],
      transformErrorResponse: (response) => {
        // Extract error message from backend response
        const errorData = response?.data || response;
        const errorMessage = errorData?.message || errorData?.error || 'Failed to archive program';
        return {
          message: errorMessage,
          error: errorMessage,
          status: response?.status,
          ...errorData
        };
      },
    }),

    // Unarchive a program
    unarchiveProgram: builder.mutation({
      query: (programId) => ({
        url: `/admin/programs/${programId}/unarchive`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, programId) => [
        "SuperadminProgram",
        { type: "SuperadminProgram", id: programId },
        { type: "FeaturedStatus", id: programId }
      ],
    }),

    // Get archived programs (for superadmin, we'll get all archived programs)
    // Note: This uses a workaround - we'll fetch all programs and filter archived ones
    // Or we can create a superadmin-specific endpoint later
    getArchivedPrograms: builder.query({
      query: () => `/program-projects/superadmin/all`,
      providesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        if (response.success && Array.isArray(response.data)) {
          // Filter only archived programs and flatten the structure
          const archivedPrograms = [];
          response.data.forEach(program => {
            if (program.status === 'archived') {
              archivedPrograms.push({
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
                organization_id: program.organization_id,
                organization_name: program.organization_name,
                organization_acronym: program.organization_acronym,
                organization_color: program.organization_color,
                orgLogo: program.orgLogo,
                is_collaborative: program.is_collaborative || false,
                collaborators: program.collaborators || [],
                submitted_by_name: program.submitted_by_name,
                submitted_by_role: program.submitted_by_role,
                edited_by_name: program.edited_by_name,
                edited_by_role: program.edited_by_role,
                manual_status_override: program.manual_status_override === true || program.manual_status_override === 1 || program.manual_status_override === '1',
                accepts_volunteers: program.accepts_volunteers !== undefined ? program.accepts_volunteers : true
              });
            }
          });
          return archivedPrograms;
        }
        return [];
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
  useArchiveProgramMutation,
  useUnarchiveProgramMutation,
  useGetArchivedProgramsQuery,
} = superadminProgramsApi
