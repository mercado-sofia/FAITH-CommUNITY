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
        return {
          url: "/apply",
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
          },
          body: formData
        }
      },
      invalidatesTags: ["Volunteers"],
    }),

  }),
})

// Export hooks for usage in components
export const { useGetVolunteersQuery, useSubmitApplicationMutation } = applyApi
