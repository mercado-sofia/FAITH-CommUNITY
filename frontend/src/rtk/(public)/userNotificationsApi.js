import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from '../baseQueryWithTokenRefresh';

export const userNotificationsApi = createApi({
  reducerPath: 'userNotificationsApi',
  baseQuery: createBaseQuery('/api/users', true),
  tagTypes: ['UserNotifications'],
  endpoints: (builder) => ({
    getUserNotifications: builder.query({
      query: () => ({
        url: 'notifications',
        method: 'GET'
      }),
      providesTags: ['UserNotifications'],
      transformResponse: (response) => {
        // Backend returns { success: true, notifications: [...] }
        // RTK Query's fetchBaseQuery automatically parses JSON, so response is the parsed object
        return response?.notifications || [];
      },
    }),
    getUnreadNotificationCount: builder.query({
      query: () => ({
        url: 'notifications/unread-count',
        method: 'GET'
      }),
      providesTags: ['UserNotifications'],
      transformResponse: (response) => {
        // Backend returns { success: true, count: number }
        // RTK Query's fetchBaseQuery automatically parses JSON, so response is the parsed object
        return { count: response?.count || 0 };
      },
    }),
    markNotificationAsRead: builder.mutation({
      query: (notificationId) => ({
        url: `notifications/${notificationId}/read`,
        method: 'PUT',
      }),
      invalidatesTags: ['UserNotifications'],
    }),
    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: 'notifications/mark-all-read',
        method: 'PUT',
      }),
      invalidatesTags: ['UserNotifications'],
    }),
  }),
});

export const {
  useGetUserNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = userNotificationsApi;
