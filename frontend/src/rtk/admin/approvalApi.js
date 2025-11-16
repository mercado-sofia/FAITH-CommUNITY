import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from "@/config/api"

// Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
const getBaseUrl = () => {
  const base = API_BASE_URL || '';
  return base ? `${base}/api/approvals/` : '/api/approvals/';
};

export const approvalApi = createApi({
  reducerPath: 'approvalApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
  }),
  tagTypes: ['Approvals'],
  endpoints: (builder) => ({
    submitUpdate: builder.mutation({
      query: (update) => ({
        url: 'submit',
        method: 'POST',
        body: update,
      }),
      invalidatesTags: ['Approvals'],
    }),
    getPendingApprovals: builder.query({
      query: () => 'pending',
      providesTags: ['Approvals'],
    }),
    approveSubmission: builder.mutation({
      query: (id) => ({
        url: `${id}/approve`,
        method: 'PUT',
      }),
      invalidatesTags: ['Approvals'],
    }),
    rejectSubmission: builder.mutation({
      query: ({ id, rejection_comment }) => ({
        url: `${id}/reject`,
        method: 'PUT',
        body: { rejection_comment },
      }),
      invalidatesTags: ['Approvals'],
    }),
  }),
});

export const {
  useSubmitUpdateMutation,
  useGetPendingApprovalsQuery,
  useApproveSubmissionMutation,
  useRejectSubmissionMutation,
} = approvalApi;
