import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/submissions/` : '/api/submissions/';
};

export const submissionApi = createApi({
  reducerPath: 'submissionApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      // Don't set Content-Type for FormData, let the browser handle it
      return headers;
    }
  }),
  tagTypes: ['Submissions'],
  endpoints: (builder) => ({
    getSubmissions: builder.query({
      query: (adminId) => `?submitted_by=${adminId}`,
      providesTags: ['Submissions']
    }),
    getSubmissionById: builder.query({
      query: (id) => `${id}`,
      providesTags: (result, error, id) => [{ type: 'Submissions', id }]
    }),
    cancelSubmission: builder.mutation({
      query: (id) => ({
        url: `${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Submissions']
    }),
    updateSubmissionStatus: builder.mutation({
      query: ({ id, status, rejection_comment }) => ({
        url: `${id}/status`,
        method: 'PUT',
        body: { status, rejection_comment }
      }),
      invalidatesTags: ['Submissions']
    }),
    updateSubmission: builder.mutation({
      query: ({ id, data }) => ({
        url: `${id}`,
        method: 'PUT',
        body: data,
        formData: true
      }),
      invalidatesTags: ['Submissions']
    })
  })
});

export const {
  useGetSubmissionsQuery,
  useGetSubmissionByIdQuery,
  useCancelSubmissionMutation,
  useUpdateSubmissionStatusMutation,
  useUpdateSubmissionMutation
} = submissionApi; 