import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../baseQueryWithTokenRefresh';

export const userNotificationsApi = createApi({
  reducerPath: 'userNotificationsApi',
  baseQuery: async (args, api, extraOptions) => {
    // Use custom base query with token refresh
    // RTK Query may pass the query result directly or as args.url
    // Handle both cases: string URL or object with url property
    let url = args.url;
    
    // If args is a string (legacy RTK Query behavior), use it as the URL
    if (typeof args === 'string') {
      url = args;
    }
    
    // Validate that url exists before constructing the full URL
    if (!url) {
      console.error('[userNotificationsApi] baseQuery: URL is undefined!', {
        args,
        argsType: typeof args,
        argsKeys: args && typeof args === 'object' ? Object.keys(args) : 'N/A'
      });
      return {
        error: {
          status: 'CUSTOM_ERROR',
          data: { message: 'Invalid API request: URL is undefined' }
        }
      };
    }
    
    const fullUrl = `/api/users/${url}`;
    
    // Ensure args is an object before spreading
    const queryArgs = typeof args === 'object' && args !== null 
      ? { ...args, url: fullUrl }
      : { url: fullUrl, method: 'GET' };
    
    const result = await baseQueryWithReauth(
      queryArgs,
      api,
      extraOptions
    );
    return result;
  },
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
