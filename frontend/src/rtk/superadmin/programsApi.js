import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const superadminProgramsApi = createApi({
  reducerPath: "superadminProgramsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080") + "/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for superadmin authentication
      const token = getState().superadmin?.token || localStorage.getItem("superAdminToken")
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["SuperadminProgram"],
  endpoints: (builder) => ({
    // Get all programs grouped by organization
    getAllProgramsByOrganization: builder.query({
      query: () => `/projects/superadmin/all`,
      providesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        console.log('superadminProgramsApi - getAllProgramsByOrganization response:', response);
        if (response.success && Array.isArray(response.data)) {
          // Group programs by organization
          const groupedPrograms = response.data.reduce((acc, program) => {
            const orgKey = program.organization_id;
            if (!acc[orgKey]) {
              acc[orgKey] = {
                organizationId: program.organization_id,
                organizationName: program.organization_name,
                organizationAcronym: program.organization_acronym,
                organizationLogo: program.organization_logo,
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
              eventStartDate: program.event_start_date,
              eventEndDate: program.event_end_date,
              multipleDates: program.multiple_dates || [],
              createdAt: program.created_at,
              updatedAt: program.updated_at
            };

            // Categorize by status
            const status = program.status;
            if (status === 'Upcoming') {
              acc[orgKey].programs.upcoming.push(programData);
            } else if (status === 'Active') {
              acc[orgKey].programs.active.push(programData);
            } else if (status === 'Completed') {
              acc[orgKey].programs.completed.push(programData);
            }

            return acc;
          }, {});

          return Object.values(groupedPrograms);
        }
        return []
      },
      transformErrorResponse: (response) => {
        console.error('superadminProgramsApi - getAllProgramsByOrganization error:', response);
        return response;
      }
    }),

    // Get programs statistics
    getProgramsStatistics: builder.query({
      query: () => `/projects/superadmin/statistics`,
      providesTags: ["SuperadminProgram"],
      transformResponse: (response) => {
        console.log('superadminProgramsApi - getProgramsStatistics response:', response);
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
        console.error('superadminProgramsApi - getProgramsStatistics error:', response);
        return response;
      }
    }),

    // Get individual program by ID with complete details
    getProgramById: builder.query({
      query: (id) => `/projects/superadmin/${id}`,
      providesTags: (result, error, id) => [{ type: "SuperadminProgram", id }],
      transformResponse: (response) => {
        console.log('superadminProgramsApi - getProgramById response:', response);
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
            organization_logo: program.organization_logo
          };
        }
        return null;
      },
      transformErrorResponse: (response) => {
        console.error('superadminProgramsApi - getProgramById error:', response);
        return response;
      }
    }),
  }),
})

export const {
  useGetAllProgramsByOrganizationQuery,
  useGetProgramsStatisticsQuery,
  useGetProgramByIdQuery,
} = superadminProgramsApi
