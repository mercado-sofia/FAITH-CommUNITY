import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: createBaseQuery('/api', false),
  tagTypes: ['Messages'],
  endpoints: (builder) => ({
    submitMessage: builder.mutation({
      query: (messageData) => ({
        url: '/messages', // baseUrl already includes /api, so just use /messages
        method: 'POST',
        body: messageData,
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      invalidatesTags: ['Messages'],
    }),
  }),
});

export const { useSubmitMessageMutation } = messagesApi;
