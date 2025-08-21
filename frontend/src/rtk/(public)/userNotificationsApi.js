import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userNotificationsApi = createApi({
  reducerPath: 'userNotificationsApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: 'http://localhost:8080/api/users/',
    prepareHeaders: (headers, { getState }) => {
      const token = localStorage.getItem('userToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
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
