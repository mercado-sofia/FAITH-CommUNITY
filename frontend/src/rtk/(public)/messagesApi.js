import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';

const getBaseUrl = () => {
  // In development, use relative paths for Next.js rewrites
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }
  return `${API_BASE_URL || ''}/api`;
};

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies
  }),
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
