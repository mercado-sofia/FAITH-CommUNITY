import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/config/api';

// Production-ready baseQuery with proper error handling
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
    return base ? `${base}/api/superadmin/notifications` : '/api/superadmin/notifications';
  };

  const result = await fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies for authentication
    prepareHeaders: (headers) => {
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers;
    },
  })(args, api, extraOptions);

  // Normalize error responses for consistent handling
  if (result.error) {
    const errorData = result.error.data;
    const status = result.error.status;

    // Handle network/CORS errors
    if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR') {
      result.error.data = {
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        error: 'Network error',
        status: status
      };
    }
    // Handle authentication errors
    else if (status === 401) {
      result.error.data = {
        message: 'Your session has expired. Please log in again.',
        error: 'Authentication required',
        status: 401
      };
    }
    // Handle authorization errors
    else if (status === 403) {
      result.error.data = {
        message: 'You do not have permission to access this resource.',
        error: 'Access denied',
        status: 403
      };
    }
    // Handle not found errors
    else if (status === 404) {
      result.error.data = {
        message: 'The requested resource was not found.',
        error: 'Not found',
        status: 404
      };
    }
    // Handle server errors
    else if (status >= 500) {
      result.error.data = {
        message: 'A server error occurred. Please try again later.',
        error: 'Server error',
        status: status
      };
    }
    // Normalize backend error messages
    else if (errorData) {
      // Extract message from various backend error formats
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
    }
    // Fallback for unknown errors
    else {
      result.error.data = {
        message: 'An unexpected error occurred. Please try again.',
        error: 'Unknown error',
        status: status || 'UNKNOWN'
      };
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
      query: ({ superAdminId, limit = 10, offset = 0 }) => {
        // Validate superAdminId
        if (!superAdminId || isNaN(parseInt(superAdminId))) {
          throw new Error('Invalid superadmin ID');
        }
        return {
          url: `/${superAdminId}?limit=${limit}&offset=${offset}&_t=${Date.now()}`,
          method: 'GET',
        };
      },
      providesTags: ['SuperAdminNotifications'],
      // Force fresh data - don't cache for long
      keepUnusedDataFor: 0,
    }),

    // Get unread notification count
    getSuperAdminUnreadCount: builder.query({
      query: (superAdminId) => {
        // Validate superAdminId
        if (!superAdminId || isNaN(parseInt(superAdminId))) {
          throw new Error('Invalid superadmin ID');
        }
        return {
          url: `/${superAdminId}/unread-count`,
          method: 'GET',
        };
      },
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
