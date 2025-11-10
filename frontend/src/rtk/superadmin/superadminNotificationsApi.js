import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';

// Custom baseQuery wrapper to handle errors properly
const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
  const result = await fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/superadmin/notifications`,
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      // Check for window to avoid SSR errors
      const token = typeof window !== 'undefined' ? localStorage.getItem('superAdminToken') : null;
      // Send token to backend - let backend handle validation
      // Backend will reject hardcoded tokens in production with 403
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  })(args, api, extraOptions);

  // If there's an error, extract the error message from the response
  if (result.error) {
    // RTK Query error format: { status: number, data: any }
    if (result.error.data) {
      const errorData = result.error.data;
      // Backend returns errors in different formats:
      // { error: "message" } or { success: false, message: "message" }
      if (errorData.error && typeof errorData.error === 'string') {
        result.error.data = { ...errorData, message: errorData.error };
      } else if (errorData.message && typeof errorData.message === 'string') {
        // Already has message, keep it
        result.error.data = errorData;
      } else if (typeof errorData === 'string') {
        // Error data is a string
        result.error.data = { message: errorData, error: errorData };
      } else {
        // Fallback: create a message from status
        const status = result.error.status;
        const statusText = typeof status === 'number' 
          ? `HTTP ${status}` 
          : status === 'FETCH_ERROR' 
            ? 'Network error' 
            : 'Unknown error';
        result.error.data = { 
          message: statusText,
          error: statusText,
          ...errorData 
        };
      }
    } else {
      // No data in error, create a default message
      const status = result.error.status;
      const statusText = typeof status === 'number' 
        ? `HTTP ${status}: Failed to fetch notifications` 
        : status === 'FETCH_ERROR' 
          ? 'Failed to fetch notifications. Please check your connection.' 
          : 'Failed to fetch notifications';
      result.error.data = { message: statusText, error: statusText };
    }
  }

  return result;
};

export const superadminNotificationsApi = createApi({
  reducerPath: 'superadminNotificationsApi',
  baseQuery: baseQueryWithErrorHandling,
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
