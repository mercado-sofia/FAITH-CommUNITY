//adminSettings.js in the admin and also manageProfiles folder in the superadmin

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const manageProfilesApi = createApi({
  reducerPath: "manageProfilesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api/admins",
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

    // Create new admin
    createAdmin: builder.mutation({
      query: (adminData) => ({
        url: "/",
        method: "POST",
        body: adminData,
      }),
      invalidatesTags: ["Admin"],
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
  }),
})

export const {
  useGetAllAdminsQuery,
  useGetAdminByIdQuery,
  useCreateAdminMutation,
  useUpdateAdminMutation,
  useDeleteAdminMutation,
  useLoginAdminMutation,
} = manageProfilesApi
