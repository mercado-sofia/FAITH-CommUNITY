import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"

export const superadminHighlightsApi = createApi({
  reducerPath: "superadminHighlightsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080") + "/api",
    prepareHeaders: (headers, { getState }) => {
      headers.set("Content-Type", "application/json")

      // Add JWT token for superadmin authentication
      // Check for window to avoid SSR errors
      const token = getState().superadmin?.token || (typeof window !== 'undefined' ? localStorage.getItem("superAdminToken") : null)
      // Send token to backend - let backend handle validation
      // Backend will reject hardcoded tokens in production with 403
      if (token) {
        headers.set("Authorization", `Bearer ${token}`)
      }

      return headers
    },
  }),
  tagTypes: ["SuperadminHighlight"],
  endpoints: (builder) => ({
    // Get all highlights for superadmin (all organizations)
    getAllHighlights: builder.query({
      query: (status) => {
        const params = status && status !== 'all' ? `?status=${status}` : ''
        return `/admin/highlights/approval/all${params}`
      },
      providesTags: ["SuperadminHighlight"],
      transformResponse: (response) => {
        if (response.highlights && Array.isArray(response.highlights)) {
          return response.highlights.map(highlight => ({
            ...highlight,
            media: highlight.media || [],
            // Ensure program_title and program_id are preserved
            program_title: highlight.program_title || null,
            program_id: highlight.program_id || null
          }))
        }
        return []
      },
    }),

    // Get highlights statistics
    getHighlightsStatistics: builder.query({
      query: () => `/admin/highlights/approval/all`,
      providesTags: ["SuperadminHighlight"],
      transformResponse: (response) => {
        if (response.highlights && Array.isArray(response.highlights)) {
          const highlights = response.highlights
          return {
            totalHighlights: highlights.length,
            approvedHighlights: highlights.filter(h => h.status === 'approved').length,
            pendingHighlights: highlights.filter(h => h.status === 'pending').length,
            rejectedHighlights: highlights.filter(h => h.status === 'rejected').length,
          }
        }
        return {
          totalHighlights: 0,
          approvedHighlights: 0,
          pendingHighlights: 0,
          rejectedHighlights: 0,
        }
      },
    }),

    // Update highlight status (approve/reject)
    updateHighlightStatus: builder.mutation({
      query: ({ highlightId, status }) => ({
        url: `/admin/highlights/approval/${highlightId}/status`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["SuperadminHighlight"],
    }),

    // Check if highlight is featured (for star functionality)
    checkFeaturedStatus: builder.query({
      query: (highlightId) => `/admin/highlights/${highlightId}/featured`,
      providesTags: ["SuperadminHighlight"],
    }),

    // Add highlight to featured
    addFeaturedHighlight: builder.mutation({
      query: (highlightId) => ({
        url: `/admin/highlights/${highlightId}/feature`,
        method: "POST",
      }),
      invalidatesTags: ["SuperadminHighlight"],
    }),

    // Remove highlight from featured
    removeFeaturedHighlight: builder.mutation({
      query: (highlightId) => ({
        url: `/admin/highlights/${highlightId}/unfeature`,
        method: "POST",
      }),
      invalidatesTags: ["SuperadminHighlight"],
    }),
  }),
})

export const {
  useGetAllHighlightsQuery,
  useGetHighlightsStatisticsQuery,
  useUpdateHighlightStatusMutation,
  useCheckFeaturedStatusQuery,
  useAddFeaturedHighlightMutation,
  useRemoveFeaturedHighlightMutation,
} = superadminHighlightsApi

