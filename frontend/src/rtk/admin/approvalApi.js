import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const approvalApi = createApi({
  reducerPath: 'approvalApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'http://localhost:8080/api/approvals/' }),
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
    actOnUpdate: builder.mutation({
      query: ({ id, action, rejection_comment }) => ({
        url: `${id}/action`,
        method: 'PUT',
        body: { action, rejection_comment },
      }),
      invalidatesTags: ['Approvals'],
    }),
  }),
});

export const {
  useSubmitUpdateMutation,
  useGetPendingApprovalsQuery,
  useActOnUpdateMutation,
} = approvalApi;
