import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const faqApi = createApi({
  reducerPath: "faqApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/faqs`,
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
  tagTypes: ["FAQ"],
  endpoints: (builder) => ({
    // Get all FAQs (for admin)
    getAllFaqs: builder.query({
      query: () => "/",
      providesTags: ["FAQ"],
    }),

    // Get active FAQs (for public)
    getActiveFaqs: builder.query({
      query: () => "/active",
      providesTags: ["FAQ"],
    }),

    // Get FAQ by ID
    getFaqById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: "FAQ", id }],
    }),

    // Create new FAQ
    createFaq: builder.mutation({
      query: (faqData) => ({
        url: "/",
        method: "POST",
        body: faqData,
      }),
      invalidatesTags: ["FAQ"],
    }),

    // Update FAQ
    updateFaq: builder.mutation({
      query: ({ id, ...faqData }) => ({
        url: `/${id}`,
        method: "PUT",
        body: faqData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "FAQ", id }, "FAQ"],
    }),

    // Delete FAQ
    deleteFaq: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["FAQ"],
    }),
  }),
})

export const {
  useGetAllFaqsQuery,
  useGetActiveFaqsQuery,
  useGetFaqByIdQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
} = faqApi
