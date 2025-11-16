import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  // In development, use empty string for relative paths (Next.js rewrites handle /api/*)
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  // In production, use the API_BASE_URL if available
  const base = API_BASE_URL || '';
  return base;
};

export const invitationsApi = createApi({
  reducerPath: "invitationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers
    },
  }),
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
  useDeleteInvitationMutation,
  useDeactivateAdminFromInvitationMutation,
  useValidateInvitationTokenQuery,
  useAcceptInvitationMutation,
} = invitationsApi
