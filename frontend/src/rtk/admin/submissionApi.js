import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const submissionApi = createApi({
  reducerPath: 'submissionApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/submissions/`,
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