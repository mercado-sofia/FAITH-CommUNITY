import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const volunteersApi = createApi({
  reducerPath: "volunteersApi",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for admin authentication
      const token = getState().admin?.token || localStorage.getItem("adminToken")
      if (token && token !== "superadmin") {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["Volunteer"],
  endpoints: (builder) => ({
    // Get all volunteers for admin view
    getAllVolunteers: builder.query({
      query: () => "/volunteers",
      providesTags: ["Volunteer"],
      transformResponse: (response) => {
        // Map backend field names to frontend expected field names
        return response.data?.map(volunteer => ({
          id: volunteer.id,
          name: volunteer.full_name,
          age: volunteer.age,
          gender: volunteer.gender,
          email: volunteer.email,
          contact: volunteer.contact_number,
          address: volunteer.address,
          occupation: volunteer.occupation,
          citizenship: volunteer.citizenship,
          program: volunteer.program_name || volunteer.program_title || 'Unknown Program',
          date: volunteer.created_at ? new Date(volunteer.created_at).toISOString().split('T')[0] : '',
          status: volunteer.status || 'Pending',
          reason: volunteer.reason,
          profile_photo_url: volunteer.profile_photo_url,
          program_id: volunteer.program_id,
          user_id: volunteer.user_id
        }))
      },
    }),

    // Get volunteers by organization for admin view
    getVolunteersByOrganization: builder.query({
      query: (orgId) => `/volunteers/organization/${orgId}`,
      providesTags: (result, error, orgId) => [{ type: "Volunteer", id: orgId }],
      transformResponse: (response) => {
        const volunteers = Array.isArray(response?.data) ? response.data : response || []
        return volunteers.map(volunteer => ({
          id: volunteer.id,
          name: volunteer.full_name,
          age: volunteer.age,
          gender: volunteer.gender,
          email: volunteer.email,
          contact: volunteer.contact_number,
          address: volunteer.address,
          occupation: volunteer.occupation,
          citizenship: volunteer.citizenship,
          program: volunteer.program_name || volunteer.program_title || 'Unknown Program',
          date: volunteer.created_at ? new Date(volunteer.created_at).toISOString().split('T')[0] : '',
          status: volunteer.status || 'Pending',
          reason: volunteer.reason,
          profile_photo_url: volunteer.profile_photo_url,
          program_id: volunteer.program_id,
          user_id: volunteer.user_id
        }))
      },
    }),

    // Get volunteers by admin's organization for admin view
    getVolunteersByAdminOrg: builder.query({
      query: (adminId) => `/volunteers/admin/${adminId}`,
      keepUnusedDataFor: 0, // Don't cache this data
      providesTags: (result, error, adminId) => [
        { type: "Volunteer", id: `admin-${adminId}` },
        "Volunteer"
      ],
      transformResponse: (response) => {
        const volunteers = Array.isArray(response?.data) ? response.data : response || []
        return volunteers.map(volunteer => ({
          id: volunteer.id,
          name: volunteer.full_name,
          age: volunteer.age,
          gender: volunteer.gender,
          email: volunteer.email,
          contact: volunteer.contact_number,
          address: volunteer.address,
          occupation: volunteer.occupation,
          citizenship: volunteer.citizenship,
          program: volunteer.program_name || volunteer.program_title || 'Unknown Program',
          date: volunteer.created_at ? new Date(volunteer.created_at).toISOString().split('T')[0] : '',
          status: volunteer.status || 'Pending',
          reason: volunteer.reason,
          profile_photo_url: volunteer.profile_photo_url,
          program_id: volunteer.program_id,
          user_id: volunteer.user_id,
          organization_name: volunteer.organization_name
        }))
      },
    }),

    // Get volunteer by ID for detailed view
    getVolunteerById: builder.query({
      query: (id) => `/volunteers/${id}`,
      providesTags: (result, error, id) => [{ type: "Volunteer", id }],
    }),

    // Update volunteer status
    updateVolunteerStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/volunteers/${id}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Volunteer", id }, "Volunteer"],
    }),

    // Soft delete volunteer (set db_status to inactive)
    softDeleteVolunteer: builder.mutation({
      query: (id) => ({
        url: `/volunteers/${id}/soft-delete`,
        method: "PUT",
      }),
      invalidatesTags: ["Volunteer"],
    }),
  }),
})

export const {
  useGetAllVolunteersQuery,
  useGetVolunteersByOrganizationQuery,
  useGetVolunteersByAdminOrgQuery,
  useGetVolunteerByIdQuery,
  useUpdateVolunteerStatusMutation,
  useSoftDeleteVolunteerMutation,
} = volunteersApi
