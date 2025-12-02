import { createApi } from "@reduxjs/toolkit/query/react"
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const invitationsApi = createApi({
  reducerPath: "invitationsApi",
  baseQuery: createBaseQuery('', false), // Empty basePath since endpoints use full paths
  tagTypes: ["Invitation"],
  endpoints: (builder) => ({
    // Send invitation
    sendInvitation: builder.mutation({
      query: ({ email }) => ({
        url: "/api/invitations/send",
        method: "POST",
        body: { email },
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Get all invitations
    getAllInvitations: builder.query({
      query: () => "/api/invitations",
      providesTags: ["Invitation"],
    }),

    // Cancel invitation
    cancelInvitation: builder.mutation({
      query: (id) => ({
        url: `/api/invitations/cancel/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Resend invitation
    resendInvitation: builder.mutation({
      query: (id) => ({
        url: `/api/invitations/resend/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Delete invitation
    deleteInvitation: builder.mutation({
      query: (id) => ({
        url: `/api/invitations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Deactivate admin from invitation
    deactivateAdminFromInvitation: builder.mutation({
      query: (id) => ({
        url: `/api/invitations/deactivate/${id}`,
        method: "PUT",
      }),
      invalidatesTags: ["Invitation"],
    }),

    // Validate invitation token (public endpoint)
    validateInvitationToken: builder.query({
      query: (token) => `/api/invitations/validate/${token}`,
    }),

    // Accept invitation (public endpoint)
    acceptInvitation: builder.mutation({
      query: (invitationData) => ({
        url: "/api/invitations/accept",
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
  useResendInvitationMutation,
  useDeleteInvitationMutation,
  useDeactivateAdminFromInvitationMutation,
  useValidateInvitationTokenQuery,
  useAcceptInvitationMutation,
} = invitationsApi
