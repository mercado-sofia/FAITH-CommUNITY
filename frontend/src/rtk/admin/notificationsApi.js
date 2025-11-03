import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/notifications`,
    prepareHeaders: (headers, { getState }) => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    // Get notifications for an admin
    getNotifications: builder.query({
      query: ({ adminId, limit = 10, offset = 0, tab = 'all' }) => ({
        url: `/${adminId}?limit=${limit}&offset=${offset}&tab=${tab}`,
        method: 'GET',
      }),
      providesTags: ['Notifications'],
      // Optimize for skeleton loading - keep data for 30 seconds
      keepUnusedDataFor: 30,
    }),

    // Get unread notification count
    getUnreadCount: builder.query({
      query: (adminId) => ({
        url: `/${adminId}/unread-count`,
        method: 'GET',
      }),
      providesTags: ['Notifications'],
    }),

    // Mark notification as read
    markAsRead: builder.mutation({
      query: ({ notificationId, adminId }) => ({
        url: `/${notificationId}/read`,
        method: 'PUT',
        body: { adminId },
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation({
      query: (adminId) => ({
        url: `/${adminId}/mark-all-read`,
        method: 'PUT',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Delete notification
    deleteNotification: builder.mutation({
      query: ({ notificationId, adminId }) => ({
        url: `/${notificationId}`,
        method: 'DELETE',
        body: { adminId },
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
