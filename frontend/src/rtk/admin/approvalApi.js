import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const approvalApi = createApi({
  reducerPath: 'approvalApi',
  baseQuery: createBaseQuery('/api/approvals', false),
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
