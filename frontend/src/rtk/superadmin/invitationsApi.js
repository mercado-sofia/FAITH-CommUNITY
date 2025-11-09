import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const invitationsApi = createApi({
  reducerPath: "invitationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/invitations`,
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for authentication - check for both admin and superadmin tokens
      // Check for window to avoid SSR errors
      const adminToken = getState().admin?.token || (typeof window !== 'undefined' ? localStorage.getItem("adminToken") : null)
      const superadminToken = getState().superadmin?.token || (typeof window !== 'undefined' ? localStorage.getItem("superAdminToken") : null)
      
      // Use superadmin token if available, otherwise use admin token
      const token = superadminToken || adminToken
      
      // Only use valid JWT tokens (not hardcoded tokens)
      if (token && token !== "superadmin") {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["Invitation"],
  endpoints: (builder) => ({
    // Send invitation
    sendInvitation: builder.mutation({
      query: ({ email }) => ({
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

    // Delete invitation
    deleteInvitation: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Deactivate admin from invitation
    deactivateAdminFromInvitation: builder.mutation({
      query: (id) => ({
        url: `/deactivate/${id}`,
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
  useDeleteInvitationMutation,
  useDeactivateAdminFromInvitationMutation,
  useValidateInvitationTokenQuery,
  useAcceptInvitationMutation,
} = invitationsApi
