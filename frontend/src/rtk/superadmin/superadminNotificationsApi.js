import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const superadminNotificationsApi = createApi({
  reducerPath: 'superadminNotificationsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/superadmin/notifications`,
    prepareHeaders: (headers, { getState }) => {
      const token = localStorage.getItem('superAdminToken');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['SuperAdminNotifications'],
  endpoints: (builder) => ({
    // Get notifications for a superadmin
    getSuperAdminNotifications: builder.query({
      query: ({ superAdminId, limit = 10, offset = 0 }) => ({
        url: `/${superAdminId}?limit=${limit}&offset=${offset}&_t=${Date.now()}`,
        method: 'GET',
      }),
      providesTags: ['SuperAdminNotifications'],
      // Force fresh data - don't cache for long
      keepUnusedDataFor: 0,
    }),

    // Get unread notification count
    getSuperAdminUnreadCount: builder.query({
      query: (superAdminId) => ({
        url: `/${superAdminId}/unread-count`,
        method: 'GET',
      }),
      providesTags: ['SuperAdminNotifications'],
    }),

    // Mark notification as read
    markSuperAdminAsRead: builder.mutation({
      query: ({ notificationId, superAdminId }) => ({
        url: `/${notificationId}/read`,
        method: 'PUT',
        body: { superAdminId },
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),

    // Mark all notifications as read
    markAllSuperAdminAsRead: builder.mutation({
      query: (superAdminId) => ({
        url: `/${superAdminId}/mark-all-read`,
        method: 'PUT',
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),

    // Delete notification
    deleteSuperAdminNotification: builder.mutation({
      query: ({ notificationId, superAdminId }) => ({
        url: `/${notificationId}`,
        method: 'DELETE',
        body: { superAdminId },
      }),
      invalidatesTags: ['SuperAdminNotifications'],
    }),
  }),
});

export const {
  useGetSuperAdminNotificationsQuery,
  useGetSuperAdminUnreadCountQuery,
  useMarkSuperAdminAsReadMutation,
  useMarkAllSuperAdminAsReadMutation,
  useDeleteSuperAdminNotificationMutation,
} = superadminNotificationsApi;
