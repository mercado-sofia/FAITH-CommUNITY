import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const faqApi = createApi({
  reducerPath: "faqApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:8080/api/faqs",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for admin authentication if needed
      const token = getState().admin?.token || localStorage.getItem("adminToken")
      if (token) {
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
