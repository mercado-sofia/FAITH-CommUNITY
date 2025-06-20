import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

// Define our API service
export const applyApi = createApi({
  reducerPath: "applyApi",
  baseQuery: fetchBaseQuery({ baseUrl: "http://localhost:8080" }),
  tagTypes: ["Volunteers"],
  endpoints: (builder) => ({
    // Get all volunteer applications
    getVolunteers: builder.query({
      query: () => "/apply",
      providesTags: ["Volunteers"],
    }),

    // Submit a new volunteer application with file upload
    submitApplication: builder.mutation({
      query: (formData) => {
        // Create a FormData object for file uploads
        const form = new FormData()

        // Add all form fields to the FormData
        Object.keys(formData).forEach((key) => {
          if (key === "validId" && formData[key]) {
            form.append("validId", formData[key])
          } else if (key !== "validId" && key !== "agreeToTerms") {
            form.append(key, formData[key])
          }
        })

        return {
          url: "/apply",
          method: "POST",
          body: form,
          // Don't set Content-Type header when sending FormData
          // RTK Query will handle it automatically
        }
      },
      invalidatesTags: ["Volunteers"],
    }),

    // Test endpoint
    testConnection: builder.mutation({
      query: () => ({
        url: "/test-post",
        method: "POST",
      }),
    }),
  }),
})

// Export hooks for usage in components
export const { useGetVolunteersQuery, useSubmitApplicationMutation, useTestConnectionMutation } = applyApi
