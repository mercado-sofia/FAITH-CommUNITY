import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: API_BASE_URL,
    credentials: 'include'
  }),
  tagTypes: ['Messages'],
  endpoints: (builder) => ({
    submitMessage: builder.mutation({
      query: (messageData) => ({
        url: '/api/messages',
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
