import { createApi } from "@reduxjs/toolkit/query/react"
import { baseQueryWithReauth } from "../baseQueryWithTokenRefresh"

// Define our API service
export const applyApi = createApi({
  reducerPath: "applyApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Volunteers"],
  endpoints: (builder) => ({
    // Get all volunteer applications
    getVolunteers: builder.query({
      query: () => "/api/apply",
      providesTags: ["Volunteers"],
    }),

    // Submit a new volunteer application
    submitApplication: builder.mutation({
      query: (formData) => ({
        url: "/api/apply",
        method: "POST",
        body: formData
      }),
      invalidatesTags: ["Volunteers"],
    }),

  }),
})

// Export hooks for usage in components
export const { useGetVolunteersQuery, useSubmitApplicationMutation } = applyApi
