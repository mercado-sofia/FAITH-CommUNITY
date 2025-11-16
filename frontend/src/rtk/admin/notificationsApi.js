import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';

// Custom base query with error handling
const baseQueryWithErrorHandling = async (args, api, extraOptions) => {
  // Check if API_BASE_URL is configured
  // Note: Empty string is valid in development (uses Next.js rewrites)
  // Only check for undefined/null, not falsy values
  if (API_BASE_URL === undefined || API_BASE_URL === null) {
    return {
      error: {
        status: 'CONFIG_ERROR',
        data: {
          message: 'API configuration error. Please contact support.',
          error: 'API_BASE_URL is not configured'
        }
      }
    };
  }
  
  // Get base URL - empty string in development (uses Next.js rewrites for same-origin requests)
  const getBaseUrl = () => {
    const base = API_BASE_URL || '';
    return base ? `${base}/api/notifications` : '/api/notifications';
  };

  const result = await fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers;
    },
  })(args, api, extraOptions);
  
  // Normalize error responses
  if (result.error) {
    const errorData = result.error.data;
    const status = result.error.status;
    
    if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR') {
      result.error.data = {
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        error: 'Network error',
        status: status
      };
    } else if (status === 401) {
      result.error.data = {
        message: 'Your session has expired. Please log in again.',
        error: 'Access token required',
        status: 401
      };
    } else if (status === 403) {
      result.error.data = {
        message: 'You do not have permission to access this resource.',
        error: 'Access denied',
        status: 403
      };
    } else if (status === 404) {
      result.error.data = {
        message: 'The requested resource was not found.',
        error: 'Not found',
        status: 404
      };
    } else if (status >= 500) {
      result.error.data = {
        message: 'A server error occurred. Please try again later.',
        error: 'Server error',
        status: status
      };
    } else if (errorData) {
      let message = 'An error occurred while processing your request.';
      if (typeof errorData === 'string') {
        message = errorData;
      } else if (errorData.error && typeof errorData.error === 'string') {
        message = errorData.error;
      } else if (errorData.message && typeof errorData.message === 'string') {
        message = errorData.message;
      }
      result.error.data = {
        message: message,
        error: errorData.error || message,
        status: status,
        ...(typeof errorData === 'object' && !Array.isArray(errorData) ? errorData : {})
      };
    } else {
      result.error.data = {
        message: 'An unexpected error occurred. Please try again.',
        error: 'Unknown error',
        status: status || 'UNKNOWN'
      };
    }
  }
  
  return result;
};

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ['Notifications'],
  endpoints: (builder) => ({
    // Get notifications for an admin
    getNotifications: builder.query({
      query: ({ adminId, limit = 10, offset = 0, tab = 'all' }) => ({
        url: `/${adminId}`,
        params: { limit, offset, tab },
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
