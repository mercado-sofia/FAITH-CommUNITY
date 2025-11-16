import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react"
import { API_BASE_URL } from '@/config/api';

const getBaseUrl = () => {
  // In development, use relative paths for Next.js rewrites
  if (process.env.NODE_ENV === 'development') {
    return '/api';
  }
  return `${API_BASE_URL || ''}/api`;
};

export const organizationsApi = createApi({
  reducerPath: "organizationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getBaseUrl(),
    credentials: 'include', // CRITICAL: Include httpOnly cookies
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json')
      // No Authorization header needed - httpOnly cookies handle authentication
      return headers
    },
  }),
  tagTypes: ["Organizations"],
  endpoints: (builder) => ({
    // Get all organizations for public use
    getAllOrganizations: builder.query({
      query: () => `/organizations`,
      providesTags: ["Organizations"],
      transformResponse: (response) => {
        // The backend returns { success: true, data: [...] }
        if (response.success && Array.isArray(response.data)) {
          return response.data.map(org => ({
            id: org.id,
            acronym: org.acronym, // This is the 'org' field from DB
            name: org.name, // This is the 'orgName' field from DB
            logo: org.logo,
            color: org.color || null // Organization color
          }))
        }
        return []
      },
      transformErrorResponse: (response) => {
        return response;
      }
    }),
  }),
})

export const {
  useGetAllOrganizationsQuery,
} = organizationsApi
