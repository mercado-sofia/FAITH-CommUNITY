// Admin management API for superadmin

import { createApi } from "@reduxjs/toolkit/query/react"
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: createBaseQuery('/api/admins', false),
  tagTypes: ["Admin"],
  endpoints: (builder) => ({
    // Get all admins
    getAllAdmins: builder.query({
      query: () => "/",
      providesTags: ["Admin"],
    }),

    // Get admin by ID
    getAdminById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "Admin", id }],
    }),

    // Update admin
    updateAdmin: builder.mutation({
      query: ({ id, ...adminData }) => ({
        url: `/${id}`,
        method: "PUT",
        body: adminData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Admin", id }, "Admin"],
    }),

    // Deactivate admin
    deactivateAdmin: builder.mutation({
      query: (id) => ({
        url: `/${id}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: ["Admin"],
    }),

    // Delete admin
    deleteAdmin: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Admin"],
    }),

    // Admin login
    loginAdmin: builder.mutation({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),

    // Verify password for email change
    verifyPasswordForEmailChange: builder.mutation({
      query: ({ id, currentPassword }) => ({
        url: `/${id}/verify-password`,
        method: "POST",
        body: { currentPassword },
      }),
    }),

    // Verify password for password change
    verifyPasswordForPasswordChange: builder.mutation({
      query: ({ id, currentPassword }) => ({
        url: `/${id}/verify-password-change`,
        method: "POST",
        body: { currentPassword },
      }),
    }),
  }),
})

export const {
  useGetAllAdminsQuery,
  useGetAdminByIdQuery,
  useUpdateAdminMutation,
  useDeactivateAdminMutation,
  useDeleteAdminMutation,
  useLoginAdminMutation,
  useVerifyPasswordForEmailChangeMutation,
  useVerifyPasswordForPasswordChangeMutation,
} = adminApi