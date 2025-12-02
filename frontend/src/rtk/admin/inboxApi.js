import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const inboxApi = createApi({
  reducerPath: 'inboxApi',
  baseQuery: createBaseQuery('', false), // Empty basePath since endpoints use full paths
  tagTypes: ['Inbox', 'UnreadCount'],
  endpoints: (builder) => ({
    getMessages: builder.query({
      query: ({ organizationId, page = 1, limit = 10, unreadOnly = false }) => ({
        url: `/api/inbox/${organizationId}`,
        params: { page, limit, unread_only: unreadOnly },
      }),
      providesTags: ['Inbox'],
      // Optimize for skeleton loading - keep data for 30 seconds
      keepUnusedDataFor: 30,
    }),
    
    getUnreadCount: builder.query({
      query: (organizationId) => ({
        url: `/api/inbox/${organizationId}/unread-count`,
      }),
      providesTags: ['UnreadCount'],
    }),
    
    markMessageAsRead: builder.mutation({
      query: ({ messageId, organizationId }) => ({
        url: `/api/inbox/${messageId}/read`,
        method: 'PATCH',
        body: { organization_id: organizationId },
      }),
      invalidatesTags: ['Inbox', 'UnreadCount'],
    }),
    
    markAllAsRead: builder.mutation({
      query: (organizationId) => ({
        url: `/api/inbox/${organizationId}/mark-all-read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Inbox', 'UnreadCount'],
    }),
    
    deleteMessage: builder.mutation({
      query: ({ messageId, organizationId }) => ({
        url: `/api/inbox/${messageId}`,
        method: 'DELETE',
        body: { organization_id: organizationId },
      }),
      invalidatesTags: ['Inbox', 'UnreadCount'],
    }),
  }),
});

export const {
  useGetMessagesQuery,
  useGetUnreadCountQuery,
  useMarkMessageAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteMessageMutation,
} = inboxApi;
