import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQueryWithTokenRefresh';

export const userNotificationsApi = createApi({
  reducerPath: 'userNotificationsApi',
  baseQuery: async (args, api, extraOptions) => {
    // Use custom base query with token refresh
    const result = await baseQueryWithReauth(
      { ...args, url: `/api/users/${args.url}` },
      api,
      extraOptions
    );
    return result;
  },
  tagTypes: ['UserNotifications'],
  endpoints: (builder) => ({
    getUserNotifications: builder.query({
      query: () => 'notifications',
      providesTags: ['UserNotifications'],
    }),
    getUnreadNotificationCount: builder.query({
      query: () => 'notifications/unread-count',
      providesTags: ['UserNotifications'],
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
