// Admin management API for superadmin

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/admins` : '/api/admins';
};

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers
    },
  }),
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
  useDeleteAdminMutation,
  useLoginAdminMutation,
  useVerifyPasswordForEmailChangeMutation,
  useVerifyPasswordForPasswordChangeMutation,
} = adminApi