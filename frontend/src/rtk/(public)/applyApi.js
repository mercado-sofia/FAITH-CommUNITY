import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

// Define our API service
export const applyApi = createApi({
  reducerPath: "applyApi",
  baseQuery: fetchBaseQuery({ 
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080" 
  }),
  tagTypes: ["Volunteers"],
  endpoints: (builder) => ({
    // Get all volunteer applications
    getVolunteers: builder.query({
      query: () => "/apply",
      providesTags: ["Volunteers"],
    }),

    // Submit a new volunteer application
    submitApplication: builder.mutation({
      query: (formData) => {
        // Check for window to avoid SSR errors
        const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
        const headers = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return {
          url: "/apply",
          method: "POST",
          headers,
          body: formData
        }
      },
      invalidatesTags: ["Volunteers"],
    }),

  }),
})

// Export hooks for usage in components
export const { useGetVolunteersQuery, useSubmitApplicationMutation } = applyApi
