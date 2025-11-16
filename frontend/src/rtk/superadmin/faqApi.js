import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/faqs` : '/api/faqs';
};

export const faqApi = createApi({
  reducerPath: "faqApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json")
      // No Authorization header needed - httpOnly cookies handle authentication
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
