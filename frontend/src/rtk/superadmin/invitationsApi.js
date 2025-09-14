import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const invitationsApi = createApi({
  reducerPath: "invitationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api/invitations",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for authentication - check for both admin and superadmin tokens
      const adminToken = getState().admin?.token || localStorage.getItem("adminToken")
      const superadminToken = getState().superadmin?.token || localStorage.getItem("superAdminToken")
      
      // Use superadmin token if available, otherwise use admin token
      const token = superadminToken || adminToken
      
      if (token) {
        // Handle hardcoded superadmin token
        if (token === "superadmin") {
          headers.set("Authorization", `Bearer superadmin`)
        } else {
          headers.set("Authorization", `Bearer ${token}`)
        }
      }

      return headers
    },
  }),
  tagTypes: ["Invitation"],
  endpoints: (builder) => ({
    // Send invitation
    sendInvitation: builder.mutation({
      query: (email) => ({
        url: "/send",
        method: "POST",
        body: { email },
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Get all invitations
    getAllInvitations: builder.query({
      query: () => "/",
      providesTags: ["Invitation"],
    }),

    // Cancel invitation
    cancelInvitation: builder.mutation({
      query: (id) => ({
        url: `/cancel/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Validate invitation token (public endpoint)
    validateInvitationToken: builder.query({
      query: (token) => `/validate/${token}`,
    }),

    // Accept invitation (public endpoint)
    acceptInvitation: builder.mutation({
      query: (invitationData) => ({
        url: "/accept",
        method: "POST",
        body: invitationData,
      }),
    }),
  }),
})

export const {
  useSendInvitationMutation,
  useGetAllInvitationsQuery,
  useCancelInvitationMutation,
  useValidateInvitationTokenQuery,
  useAcceptInvitationMutation,
} = invitationsApi
