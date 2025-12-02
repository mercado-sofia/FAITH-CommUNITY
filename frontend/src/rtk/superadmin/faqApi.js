import { createApi } from "@reduxjs/toolkit/query/react"
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const faqApi = createApi({
  reducerPath: "faqApi",
  baseQuery: createBaseQuery('/api/faqs', false),
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
